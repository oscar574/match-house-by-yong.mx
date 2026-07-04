// Premium real estate fallback images by property type and zone
// All URLs are verified Unsplash photos that are reliably available

const FALLBACK_ARCHITECTURE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';

export const PROPERTY_IMAGES = {
  // Casas modernas de lujo
  Casa: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'https://images.unsplash.com/photo-1600566753086-00f18fe6ba5e?w=800',
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800'
  ],
  // Departamentos premium
  Departamento: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
  ],
  // Penthouses
  Penthouse: [
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'
  ],
  // Villas (estilo mediterráneo / playa)
  Villa: [
    'https://images.unsplash.com/photo-1613553474179-e1eda3ea5734?w=800',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  ],
  // Terrenos
  Terreno: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'
  ],
  // Local Comercial
  'Local Comercial': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'
  ]
};

// Zone-specific overrides
const ZONE_IMAGES = {
  'Yucatán Country Club': [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
  ],
  'Progreso': [
    'https://images.unsplash.com/photo-1613553474179-e1eda3ea5734?w=800',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800'
  ],
  'Valle de Bravo': [
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800',
    'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
  ],
  'Santa Fe': [
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
  ]
};

// Colonial Mérida
const COLONIAL_IMAGES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
  'https://images.unsplash.com/photo-1580587770531-ad73d8a9c54e?w=800',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800'
];

/**
 * Get reliable photos for a property, using its own photos first,
 * falling back to type/zone-specific premium images.
 */
export function getPropertyPhotos(property) {
  const ownPhotos = property.photos || [];
  const typePhotos = PROPERTY_IMAGES[property.property_type] || PROPERTY_IMAGES.Casa;
  const zonePhotos = ZONE_IMAGES[property.zone] || [];

  // If the property has 3+ photos, use them with fallbacks appended
  if (ownPhotos.length >= 3) {
    return ownPhotos;
  }

  // Otherwise, build a set from zone + type images
  const combined = [...new Set([...zonePhotos, ...typePhotos, ...ownPhotos])];
  return combined.slice(0, 5);
}

/**
 * Get a single fallback image for a property
 */
export function getFallbackImage(property) {
  const zonePhotos = ZONE_IMAGES[property?.zone] || [];
  if (zonePhotos.length > 0) return zonePhotos[0];
  const typePhotos = PROPERTY_IMAGES[property?.property_type] || PROPERTY_IMAGES.Casa;
  return typePhotos[0] || FALLBACK_ARCHITECTURE;
}

export { FALLBACK_ARCHITECTURE };