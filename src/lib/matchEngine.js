// Simple affinity matching engine
export function calculateMatch(property, clientPreferences) {
  let score = 0;
  let reasons = [];
  let maxScore = 0;

  // City match (20 pts)
  maxScore += 20;
  if (clientPreferences.city && property.city === clientPreferences.city) {
    score += 20;
    reasons.push(`buscas en ${property.city}`);
  }

  // Zone match (15 pts)
  maxScore += 15;
  if (clientPreferences.favorite_zones?.includes(property.zone)) {
    score += 15;
    reasons.push(`te interesa ${property.zone}`);
  }

  // Budget match (20 pts)
  maxScore += 20;
  const budgetRanges = {
    'Menos de $3M': [0, 3000000],
    '$3M a $5M': [3000000, 5000000],
    '$5M a $10M': [5000000, 10000000],
    '$10M a $20M': [10000000, 20000000],
    'Más de $20M': [20000000, 100000000],
  };
  const range = budgetRanges[clientPreferences.budget_range];
  if (range) {
    if (property.price >= range[0] && property.price <= range[1]) {
      score += 20;
      reasons.push('está dentro de tu presupuesto');
    } else if (property.price >= range[0] * 0.8 && property.price <= range[1] * 1.2) {
      score += 10;
    }
  }

  // Property type match (10 pts)
  maxScore += 10;
  if (clientPreferences.property_type_wanted === property.property_type) {
    score += 10;
    reasons.push(`buscas ${property.property_type.toLowerCase()}`);
  }

  // Bedrooms match (10 pts)
  maxScore += 10;
  if (clientPreferences.bedrooms_wanted) {
    if (clientPreferences.bedrooms_wanted === 'No importa') {
      score += 10;
    } else if (clientPreferences.bedrooms_wanted === '4 o más' && property.bedrooms >= 4) {
      score += 10;
      reasons.push(`${property.bedrooms} recámaras`);
    } else if (String(property.bedrooms) === clientPreferences.bedrooms_wanted) {
      score += 10;
      reasons.push(`${property.bedrooms} recámaras`);
    }
  }

  // Features match (25 pts total, ~4pts each)
  maxScore += 25;
  const featureMap = {
    'Alberca': () => property.amenities?.some(a => a.toLowerCase().includes('alberca') || a.toLowerCase().includes('piscina')),
    'Jardín': () => property.amenities?.some(a => a.toLowerCase().includes('jardín')),
    'Seguridad': () => property.has_security,
    'Campo de golf': () => property.near_golf,
    'Cercanía a playa': () => property.near_beach,
    'Potencial de renta': () => property.rental_potential,
    'Diseño y arquitectura': () => property.architectural_style && property.architectural_style !== 'N/A',
    'Vista': () => property.amenities?.some(a => a.toLowerCase().includes('vista')),
    'Terraza': () => property.amenities?.some(a => a.toLowerCase().includes('terraza')),
    'Inversión': () => property.rental_potential || property.investment_profile?.includes('Inversión'),
    'Privacidad': () => property.amenities?.some(a => a.toLowerCase().includes('privacidad')),
    'Ubicación': () => true,
    'Precio': () => true,
    'Amenidades': () => (property.amenities?.length || 0) > 3,
    'Cercanía a escuelas': () => false,
  };

  const features = clientPreferences.important_features || [];
  const featurePoints = features.length > 0 ? 25 / features.length : 0;
  features.forEach(f => {
    const check = featureMap[f];
    if (check && check()) {
      score += featurePoints;
      reasons.push(`valoras ${f.toLowerCase()}`);
    }
  });

  const percentage = Math.min(Math.round((score / maxScore) * 100), 99);
  
  // Keep top 3 reasons
  const topReasons = reasons.slice(0, 3);
  const reasonText = topReasons.length > 0 
    ? `Compatible porque ${topReasons.join(', ')}.`
    : 'Propiedad que podría interesarte.';

  return { percentage, reasonText, reasons: topReasons };
}

export function formatPrice(price, currency = 'MXN') {
  if (!price) return '';
  if (price >= 1000000) {
    const millions = price / 1000000;
    return `$${millions % 1 === 0 ? millions : millions.toFixed(1)}M ${currency}`;
  }
  return `$${price.toLocaleString()} ${currency}`;
}