// Duplicate detection for properties - simple rule-based, no external APIs

/**
 * Finds duplicate groups among properties.
 * Rule 1: same exact price AND same exact construction_area => possible duplicate.
 * Rule 2: if also same zone OR same bedrooms OR same bathrooms => grouped as duplicate.
 */
export function findDuplicateGroups(properties) {
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < properties.length; i++) {
    if (visited.has(properties[i].id)) continue;
    const a = properties[i];
    if (!a.price || !a.construction_area) continue;

    const group = [a];
    visited.add(a.id);

    for (let j = i + 1; j < properties.length; j++) {
      if (visited.has(properties[j].id)) continue;
      const b = properties[j];
      if (!b.price || !b.construction_area) continue;

      const samePrice = a.price === b.price;
      const sameArea = a.construction_area === b.construction_area;
      if (!samePrice || !sameArea) continue;

      const sameZone = (a.zone || '') === (b.zone || '') && a.zone;
      const sameBedrooms = a.bedrooms === b.bedrooms && a.bedrooms;
      const sameBathrooms = a.bathrooms === b.bathrooms && a.bathrooms;

      if (sameZone || sameBedrooms || sameBathrooms) {
        group.push(b);
        visited.add(b.id);
      }
    }

    if (group.length > 1) groups.push(group);
  }

  return groups;
}

/**
 * Scores a property for master selection. Higher = better.
 */
function propertyScore(p) {
  let score = 0;
  // Better cover photo
  if (p.cover_photo_url) score += 30;
  // More photos
  const photoCount = (p.photos?.length || 0) + (p.photo_urls?.length || 0);
  score += Math.min(photoCount, 10) * 3;
  // Info completeness
  if (p.description) score += 5;
  if (p.bedrooms) score += 3;
  if (p.bathrooms) score += 3;
  if (p.land_area) score += 3;
  if (p.amenities?.length) score += Math.min(p.amenities.length, 5) * 2;
  if (p.tags?.length) score += Math.min(p.tags.length, 5);
  // Commission confirmed
  if (p.commission_status === 'Confirmada') score += 25;
  // Manual priority
  if (p.manual_priority === 'Alta') score += 15;
  else if (p.manual_priority === 'Media') score += 8;
  // Recent update
  const updatedAt = new Date(p.updated_date || p.created_date || 0).getTime();
  score += Math.min(updatedAt / 1e10, 10);
  return score;
}

/**
 * Selects the master (best) property from a duplicate group.
 */
export function selectMaster(group) {
  return [...group].sort((a, b) => propertyScore(b) - propertyScore(a))[0];
}

/**
 * Computes duplicate flags for all properties.
 * Returns: { masterIds: Set, hiddenIds: Set, groups: Array, updates: Array<{id, updates}> }
 */
export function computeDuplicateFlags(properties) {
  const groups = findDuplicateGroups(properties);
  const masterIds = new Set();
  const hiddenIds = new Set();
  const updates = [];
  const groupIdMap = {};

  groups.forEach((group, idx) => {
    const groupId = `dup_${idx}_${group[0].id.slice(-6)}`;
    const master = selectMaster(group);

    group.forEach(p => {
      groupIdMap[p.id] = groupId;
      if (p.id === master.id) {
        masterIds.add(p.id);
        if (p.is_duplicate !== false || p.duplicate_master_property_id !== null || p.duplicate_group_id !== groupId) {
          updates.push({
            id: p.id,
            updates: {
              is_duplicate: false,
              duplicate_group_id: groupId,
              duplicate_master_property_id: null,
              duplicate_confidence_score: 95,
              manual_review_required: false
            }
          });
        }
      } else {
        hiddenIds.add(p.id);
        const confidence = 85 + (group.filter(g => g.bedrooms === p.bedrooms && g.bedrooms).length > 0 ? 10 : 0);
        if (p.is_duplicate !== true || p.duplicate_master_property_id !== master.id || p.duplicate_group_id !== groupId) {
          updates.push({
            id: p.id,
            updates: {
              is_duplicate: true,
              duplicate_group_id: groupId,
              duplicate_master_property_id: master.id,
              duplicate_confidence_score: confidence,
              manual_review_required: p.manual_review_required || false
            }
          });
        }
      }
    });
  });

  // Clear flags for properties no longer in any duplicate group
  const allDupIds = new Set([...masterIds, ...hiddenIds]);
  properties.forEach(p => {
    if (!allDupIds.has(p.id) && (p.is_duplicate === true || p.duplicate_group_id)) {
      updates.push({
        id: p.id,
        updates: {
          is_duplicate: false,
          duplicate_group_id: null,
          duplicate_master_property_id: null,
          duplicate_confidence_score: 0
        }
      });
    }
  });

  return { masterIds, hiddenIds, groups, updates, groupIdMap };
}

/**
 * Counts duplicate groups and hidden properties.
 */
export function countDuplicates(properties) {
  const { groups, hiddenIds } = computeDuplicateFlags(properties);
  return {
    groups: groups.length,
    hidden: hiddenIds.size,
    total: properties.length
  };
}

/**
 * Filter: returns only visible (non-duplicate-hidden) properties.
 */
export function filterVisible(properties) {
  return properties.filter(p => p.is_duplicate !== true);
}

/**
 * Groups properties by duplicate_group_id for admin display.
 */
export function groupDuplicates(properties) {
  const map = {};
  properties.forEach(p => {
    const gid = p.duplicate_group_id;
    if (!gid) return;
    if (!map[gid]) map[gid] = [];
    map[gid].push(p);
  });
  return Object.values(map).filter(g => g.length > 0);
}