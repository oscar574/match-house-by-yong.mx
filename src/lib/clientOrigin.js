// Calculated origin label for a client record.
// Order: @example.com email -> Datos de prueba (gray);
//        lead_source starts with "Demo" or whatsapp starts with "demo-" -> Modo demo (amber);
//        otherwise -> Cliente real (green).
export function clientOrigin(client) {
  if (client?.email && String(client.email).toLowerCase().endsWith('@example.com')) {
    return { key: 'demo_data', label: 'Datos de prueba', className: 'bg-gray-100 text-latitud-gray' };
  }
  const ls = String(client?.lead_source || '').toLowerCase();
  const wa = String(client?.whatsapp || '');
  if (ls.startsWith('demo') || wa.startsWith('demo-')) {
    return { key: 'demo_mode', label: 'Modo demo', className: 'bg-amber-50 text-amber-600' };
  }
  return { key: 'real', label: 'Cliente real', className: 'bg-green-50 text-green-600' };
}

// Normalized phone key (digits only) used to group duplicates.
export function phoneKey(client) {
  return String(client?.whatsapp || '').replace(/\D/g, '');
}