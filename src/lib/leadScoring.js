// Lead scoring engine for MatchHouse
// Tracks buyer intention based on interactions

export const LEAD_ACTIONS = {
  VIEW_20s: { points: 2, label: 'Ver propiedad >20s' },
  VIEW_ALL_PHOTOS: { points: 4, label: 'Ver todas las fotos' },
  REOPEN_PROPERTY: { points: 6, label: 'Volver a abrir propiedad' },
  SAVE_FAVORITE: { points: 8, label: 'Guardar favorita' },
  COMPARE_PROPERTIES: { points: 8, label: 'Comparar propiedades' },
  SHARE_PROPERTY: { points: 15, label: 'Compartir propiedad' },
  REQUEST_INFO: { points: 12, label: 'Solicitar información' },
  REQUEST_VISIT: { points: 30, label: 'Solicitar cita' },
  COMPLETE_PROFILE: { points: 10, label: 'Completar perfil' }
};

export function getLeadStatus(score, hasVisitRequest = false) {
  if (hasVisitRequest) return 'prioridad máxima';
  if (score >= 50) return 'alta intención';
  if (score >= 35) return 'lead calificado';
  if (score >= 15) return 'interesado';
  return 'explorando';
}

export function getLeadStatusLabel(status) {
  const labels = {
    'explorando': 'Explorando',
    'interesado': 'Interesado',
    'lead calificado': 'Lead calificado',
    'alta intención': 'Alta intención',
    'prioridad máxima': 'Prioridad máxima'
  };
  return labels[status] || 'Explorando';
}

export function addLeadScore(currentScore, action, hasVisitRequest = false) {
  const actionDef = LEAD_ACTIONS[action];
  if (!actionDef) return { score: currentScore, status: getLeadStatus(currentScore, hasVisitRequest) };
  const newScore = currentScore + actionDef.points;
  return { score: newScore, status: getLeadStatus(newScore, hasVisitRequest) };
}

// Build a client update object that keeps buyer_intent_score, lead_score and lead_status in sync.
// Pass the current client object (or null) and an action key from LEAD_ACTIONS.
export function buildIntentUpdate(client, action) {
  const current = client?.buyer_intent_score ?? client?.lead_score ?? 0;
  const hasVisit = (client?.visit_requests_count || 0) > 0 || action === 'REQUEST_VISIT';
  const { score, status } = addLeadScore(current, action, hasVisit);
  return {
    buyer_intent_score: score,
    lead_score: score,
    lead_status: status
  };
}