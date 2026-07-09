// Central commercial rule for MatchHouse: buyers only see shared-commission homes.
// This module is the single source of truth for buyer visibility across all
// buyer-facing views (Discover, Favorites, Property Detail, recommendations, search).
//
// RULE: commission_required_for_visibility = true
// No property is shown to a buyer unless it shares commission and can generate
// income for the agency/advisor.

export const COMMISSION_REQUIRED_FOR_VISIBILITY = true;

// Reasons a property can be hidden from buyers / flagged in MLS review.
export const HIDDEN_REASONS = {
  NO_SHARED_COMMISSION: 'no_shared_commission',
  COMMISSION_UNKNOWN: 'commission_unknown',
  NOT_HOUSE: 'not_house',
  NOT_SALE: 'not_sale',
  INACTIVE: 'inactive',
  MISSING_PRICE: 'missing_price',
  MISSING_CONSTRUCTION_M2: 'missing_construction_m2',
  MISSING_PHOTOS: 'missing_photos',
  DUPLICATE_HIDDEN: 'duplicate_hidden',
  MANUAL_HIDDEN: 'manual_hidden',
  SYNC_ERROR: 'sync_error'
};

export const HIDDEN_REASON_LABELS = {
  no_shared_commission: 'Sin comisión compartida',
  commission_unknown: 'Comisión desconocida',
  not_house: 'No es casa',
  not_sale: 'No es venta',
  inactive: 'Inactiva / vendida / rentada',
  missing_price: 'Sin precio',
  missing_construction_m2: 'Sin m² de construcción',
  missing_photos: 'Sin fotos',
  duplicate_hidden: 'Duplicado oculto',
  manual_hidden: 'Ocultada manualmente',
  sync_error: 'Error de sincronización'
};

// Statuses that count as "confirmed" and therefore visible to the buyer.
// Kept bilingual for backward compatibility with existing demo data ("Confirmada").
const CONFIRMED_STATUSES = ['Confirmada', 'confirmed', 'manually_confirmed', 'own_inventory'];

export function isCommissionConfirmed(p) {
  return !!p && CONFIRMED_STATUSES.includes(p.commission_status);
}

export function hasPhotos(p) {
  return !!(
    p?.cover_photo_url ||
    (p?.photos && p.photos.length > 0) ||
    (p?.photo_urls && p.photo_urls.length > 0)
  );
}

export function hasConstructionM2(p) {
  return (p?.construction_m2 || p?.construction_area || 0) > 0;
}

// Land-type set: lots, ranchos, quintas, huertas, etc. have no construction m² —
// use land_m2 as the valid area measure instead. English equivalents included
// for compatibility.
const LAND_TYPES = new Set(['terreno','terreno comercial','terreno industrial','terreno habitacional','lote','huerta','rancho','quinta','land','lot','terrain','ranch']);
export function isLandType(pt) {
  if (!pt) return false;
  return LAND_TYPES.has(pt.toString().toLowerCase().trim());
}

// Evaluate a property against the commercial rule.
// Returns { visible: boolean, reason: string|null }.
export function evaluateBuyerVisibility(p) {
  if (!p) return { visible: false, reason: HIDDEN_REASONS.SYNC_ERROR };

  // Duplicates (copies, not masters) are hidden.
  if (p.is_duplicate === true) return { visible: false, reason: HIDDEN_REASONS.DUPLICATE_HIDDEN };

  // Own inventory (connected EasyBroker Standard account) is commercially valid
  // for Latitud — all property types and operations are visible (houses,
  // apartments, land, commercial; sale and rental) as long as they pass the
  // quality filters below. Collaborator/MLS inventory requires confirmed shared
  // commission and only houses for sale.
  const isOwn = p.own_inventory === true || p.commission_status === 'own_inventory';

  if (!isOwn) {
    // MLS / collaborator: only houses for sale with confirmed shared commission.
    if (p.property_type !== 'Casa') return { visible: false, reason: HIDDEN_REASONS.NOT_HOUSE };
    if (p.operation_type !== 'Venta') return { visible: false, reason: HIDDEN_REASONS.NOT_SALE };
    if (p.commission_status === 'not_shared') return { visible: false, reason: HIDDEN_REASONS.NO_SHARED_COMMISSION };
    if (p.commission_status === 'unknown' || !p.commission_status) return { visible: false, reason: HIDDEN_REASONS.COMMISSION_UNKNOWN };
    if (!isCommissionConfirmed(p)) return { visible: false, reason: HIDDEN_REASONS.COMMISSION_UNKNOWN };
    if (p.collaboration_enabled !== true && p.shared_commission !== true) {
      return { visible: false, reason: HIDDEN_REASONS.NO_SHARED_COMMISSION };
    }
  }

  // Quality filters (own inventory + MLS): active, price, area, photos.
  if (p.status !== 'Disponible') return { visible: false, reason: HIDDEN_REASONS.INACTIVE };
  if (!(p.price > 0)) return { visible: false, reason: HIDDEN_REASONS.MISSING_PRICE };
  // Land lots have no construction m² — use land_m2 instead.
  const isLand = isLandType(p.property_type);
  const hasArea = isLand ? (p.land_m2 || p.land_area || 0) > 0 : hasConstructionM2(p);
  if (!hasArea) return { visible: false, reason: HIDDEN_REASONS.MISSING_CONSTRUCTION_M2 };
  if (!hasPhotos(p)) return { visible: false, reason: HIDDEN_REASONS.MISSING_PHOTOS };

  // Manual hide flags.
  if (p.is_visible_in_app === false || p.visible_to_clients === false) {
    return { visible: false, reason: HIDDEN_REASONS.MANUAL_HIDDEN };
  }

  return { visible: true, reason: null };
}

// Boolean helper for filters used in buyer views.
export function isBuyerVisible(p) {
  return evaluateBuyerVisibility(p).visible;
}

// Compute the hidden_reason for an MLS-imported candidate and the flags to persist.
export function computeHiddenFlags(p) {
  const { visible, reason } = evaluateBuyerVisibility(p);
  return {
    is_visible_to_buyer: visible,
    hidden_reason: visible ? null : reason
  };
}

// ---- EasyBroker data-source mode (demo / standard / mls) ----
const MODE_KEY = 'matchhouse_eb_mode';
export const EB_MODES = [
  { value: 'demo', label: 'Demo data' },
  { value: 'standard', label: 'EasyBroker Standard' },
  { value: 'mls', label: 'EasyBroker MLS' }
];

export function getEasyBrokerMode() {
  return localStorage.getItem(MODE_KEY) || 'demo';
}

export function setEasyBrokerMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function modeWarning(mode) {
  if (mode === 'demo') return 'Demo data is active. Connect EasyBroker MLS API to show real shared-commission inventory.';
  if (mode === 'standard') return 'EasyBroker Standard API is connected. You can sync the connected account\u2019s own inventory. MLS API Plan is required to sync collaborator shared-commission listings. — La API estándar de EasyBroker está conectada. Puedes sincronizar el inventario propio de la cuenta. Para sincronizar propiedades de colaboradores con comisión compartida se requiere MLS API Plan.';
  if (mode === 'mls') return 'MLS mode is active. Buyers only see shared-commission properties that pass commercial filters.';
  return 'Demo data is active. Connect EasyBroker Standard API to sync the connected account\u2019s own inventory.';
}