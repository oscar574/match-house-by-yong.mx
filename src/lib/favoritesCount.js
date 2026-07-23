import { base44 } from '@/api/base44Client';
import { isBuyerVisible } from '@/lib/commissionRules';

// Single source of truth for a client's like/dislike favorites.
//
// Deduplicates reactions by property_id (Set), fetches the actual property
// records (regardless of current visibility), and splits them into available
// vs no-longer-available. Also returns the IDs of duplicate reaction records so
// the Favorites screen (which owns cleanup) can delete them.
export async function getClientFavorites(clientId) {
  const empty = {
    likedIds: [],
    dislikedIds: [],
    visitRequestIds: [],
    likedProperties: [],
    dislikedProperties: [],
    availableCount: 0,
    unavailableCount: 0,
    duplicateReactionIds: []
  };
  if (!clientId) return empty;

  const [likeReactions, dislikeReactions, visitReactions] = await Promise.all([
    base44.entities.Reaction.filter({ client_id: clientId, reaction_type: 'like' }),
    base44.entities.Reaction.filter({ client_id: clientId, reaction_type: 'dislike' }),
    base44.entities.Reaction.filter({ client_id: clientId, reaction_type: 'visit_request' })
  ]);

  const likedIds = [];
  const dislikedIds = [];
  const duplicateReactionIds = [];
  const seenLike = new Set();
  for (const r of likeReactions) {
    if (seenLike.has(r.property_id)) duplicateReactionIds.push(r.id);
    else { seenLike.add(r.property_id); likedIds.push(r.property_id); }
  }
  const seenDislike = new Set();
  for (const r of dislikeReactions) {
    if (seenDislike.has(r.property_id)) duplicateReactionIds.push(r.id);
    else { seenDislike.add(r.property_id); dislikedIds.push(r.property_id); }
  }
  const visitRequestIds = [...new Set(visitReactions.map(r => r.property_id))];

  const [likedProperties, dislikedProperties] = await Promise.all([
    likedIds.length > 0 ? base44.entities.Property.filter({ id: { $in: likedIds } }) : [],
    dislikedIds.length > 0 ? base44.entities.Property.filter({ id: { $in: dislikedIds } }) : []
  ]);

  const availableCount = likedProperties.filter(isBuyerVisible).length;
  const unavailableCount = likedProperties.length - availableCount;

  return { likedIds, dislikedIds, visitRequestIds, likedProperties, dislikedProperties, availableCount, unavailableCount, duplicateReactionIds };
}