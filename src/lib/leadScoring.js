// Lead scoring engine for MatchHouse
// Tracks buyer intention based on interactions

import { base44 } from '@/api/base44Client';

export const LEAD_ACTIONS = {
  VIEW_20s: { points: 2, label: 'Ver propiedad >20s' },
  VIEW_ALL_PHOTOS: { points: 4, label: 'Ver todas las fotos' },
  REOPEN_PROPERTY: { points: 6, label: 'Volver a abrir propiedad' },
  SAVE_FAVORITE: { points: 8, label: 'Guardar favorita' },
  SAVE_3_FAVORITES: { points: 10, label: 'Guardar 3 favoritas (bonus)' },
  SAVE_5_FAVORITES: { points: 15, label: 'Guardar 5 favoritas (bonus)' },
  COMPARE_PROPERTIES: { points: 8, label: 'Comparar propiedades' },
  SHARE_PROPERTY: { points: 15, label: 'Compartir propiedad' },
  REQUEST_INFO: { points: 12, label: 'Solicitar información' },
  REQUEST_VISIT: { points: 30, label: 'Solicitar visita' },
  REQUEST_TOUR: { points: 35, label: 'Solicitar recorrido' },
  OPEN_WHATSAPP: { points: 20, label: 'Abrir WhatsApp' },
  COMPLETE_PROFILE: { points: 10, label: 'Completar perfil' }
};

// 0-14 explorando · 15-34 interesado · 35-59 lead calificado · 60+ alta intención
// recorrido solicitado = prioridad máxima
export function getLeadStatus(score, hasVisitRequest = false) {
  if (hasVisitRequest) return 'prioridad máxima';
  if (score >= 60) return 'alta intención';
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
export function buildIntentUpdate(client, action) {
  const current = client?.buyer_intent_score ?? client?.lead_score ?? 0;
  const hasVisit = (client?.visit_requests_count || 0) > 0 || action === 'REQUEST_VISIT' || action === 'REQUEST_TOUR';
  const { score, status } = addLeadScore(current, action, hasVisit);
  return {
    buyer_intent_score: score,
    lead_score: score,
    lead_status: status
  };
}

// Idempotently create a follow-up Task for a lead (skips if an open task with the
// same title already exists for the client). Used by the auto-task triggers.
export async function ensureLeadTask({ clientId, clientName, advisor, title, taskType, priority, propertyId, propertyName, dueInDays = 1 }) {
  if (!clientId) return null;
  try {
    const existing = await base44.entities.Task.filter({ client_id: clientId, title, status: 'Pendiente' });
    if (existing.length > 0) return existing[0];
    const due = new Date(Date.now() + dueInDays * 86400000).toISOString().split('T')[0];
    return await base44.entities.Task.create({
      title,
      description: propertyName ? `Propiedad: ${propertyName}` : '',
      task_type: taskType,
      client_id: clientId,
      client_name: clientName || '',
      property_id: propertyId || '',
      assigned_to: advisor || '',
      status: 'Pendiente',
      priority: priority || 'Media',
      due_date: due
    });
  } catch (e) {
    return null;
  }
}