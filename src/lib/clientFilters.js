// Shared hard-filter logic for buyer preferences.
// Zones and budget are HARD filters: the Discover deck, carousels and
// recommendations only show properties in the client's preferred zones and
// within budget (max with a 15% tolerance). Operation and min bedrooms are
// also hard filters. The match score only orders within the filtered subset.
import { isBuyerVisible } from '@/lib/commissionRules';

const BUDGET_TOLERANCE = 0.15;

// Preferred zones set (neighborhoods + cities) from the client record.
export function getPreferredZones(client) {
  if (!client) return [];
  const zones = new Set();
  (client.favorite_zones || []).forEach(z => { if (z) zones.add(String(z).trim()); });
  (client.preferred_neighborhoods || []).forEach(z => { if (z) zones.add(String(z).trim()); });
  return Array.from(zones);
}

export function propertyInPreferredZone(p, zones) {
  if (!zones || zones.length === 0) return true;
  // Normalize both sides (lowercase, strip accents, trim) so differences in
  // casing or accents don't silently break the zone/city match.
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const z = norm(p.zone);
  const c = norm(p.city);
  return zones.some(zone => {
    const zn = norm(zone);
    return zn === z || zn === c;
  });
}

export function operationForClient(client) {
  const op = client?.operation_preference;
  if (op === 'Comprar') return 'Venta';
  if (op === 'Rentar') return 'Renta';
  return null; // Explorar or unset -> no operation filter
}

export function propertyMatchesOperation(p, client) {
  const op = operationForClient(client);
  if (!op) return true;
  return p.operation_type === op;
}

export function propertyMatchesBudget(p, client) {
  const min = client?.budget_min_estimated;
  const max = client?.budget_max_estimated;
  const price = p.price || 0;
  if (min != null && min > 0 && price < min) return false;
  if (max != null && max > 0 && price > max * (1 + BUDGET_TOLERANCE)) return false;
  return true;
}

export function propertyMatchesBedrooms(p, client) {
  const min = client?.preferred_bedrooms;
  const max = client?.preferred_bedrooms_max;
  const beds = p.bedrooms || 0;
  if (min != null && min > 0 && beds < min) return false;
  if (max != null && max > 0 && beds > max) return false;
  return true;
}

// Hard filters excluding zone: visibility + operation + budget + bedrooms.
export function passesClientHardFilters(p, client) {
  if (!isBuyerVisible(p)) return false;
  if (!propertyMatchesOperation(p, client)) return false;
  if (!propertyMatchesBudget(p, client)) return false;
  if (!propertyMatchesBedrooms(p, client)) return false;
  return true;
}

// Split properties into inZone / outOfZone.
// If the client has no preferred zones, everything (that passes the other hard
// filters) goes to inZone and outOfZone is empty.
export function partitionByClientPreferences(properties, client) {
  const zones = getPreferredZones(client);
  const hasZoneFilter = zones.length > 0;
  const inZone = [];
  const outOfZone = [];
  for (const p of properties || []) {
    if (!passesClientHardFilters(p, client)) continue;
    if (hasZoneFilter && !propertyInPreferredZone(p, zones)) outOfZone.push(p);
    else inZone.push(p);
  }
  return { inZone, outOfZone, hasZoneFilter };
}

// Live counter for onboarding: count visible properties matching accumulated prefs.
export function countAvailable(properties, prefs) {
  let count = 0;
  const zones = (prefs && prefs.zones) || [];
  for (const p of properties || []) {
    if (!isBuyerVisible(p)) continue;
    if (prefs.operation === 'Comprar' && p.operation_type !== 'Venta') continue;
    if (prefs.operation === 'Rentar' && p.operation_type !== 'Renta') continue;
    if (zones.length > 0 && !propertyInPreferredZone(p, zones)) continue;
    if (prefs.priceMin > 0 && (p.price || 0) < prefs.priceMin) continue;
    if (prefs.priceMax > 0 && (p.price || 0) > prefs.priceMax * (1 + BUDGET_TOLERANCE)) continue;
    if (prefs.bedroomsMin > 0 && (p.bedrooms || 0) < prefs.bedroomsMin) continue;
    if (prefs.bedroomsMax > 0 && (p.bedrooms || 0) > prefs.bedroomsMax) continue;
    count++;
  }
  return count;
}

// Unique zones + cities present in the visible inventory (for onboarding/edit search).
export function availableZonesFromProperties(properties) {
  const zones = new Set();
  (properties || []).forEach(p => {
    if (!isBuyerVisible(p)) return;
    if (p.zone) zones.add(String(p.zone).trim());
    if (p.city) zones.add(String(p.city).trim());
  });
  return Array.from(zones).filter(Boolean).sort();
}

export function budgetLabel(min, max) {
  const fmt = (n) => {
    if (n >= 1000000) {
      const m = n / 1000000;
      return `$${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    return `$${Number(n).toLocaleString('es-MX')}`;
  };
  if ((!min || min <= 0) && (!max || max <= 0)) return 'Sin definir';
  if (!min || min <= 0) return `Hasta ${fmt(max)}`;
  if (!max || max <= 0) return `Desde ${fmt(min)}`;
  return `${fmt(min)} - ${fmt(max)}`;
}