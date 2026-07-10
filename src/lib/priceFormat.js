// Thousands-separator formatting for price inputs and displays (es-MX).
// 30000000 -> "30,000,000" for display; parse back to a clean number.

export function formatThousands(n) {
  if (n === null || n === undefined || n === '') return '';
  const num = Number(n);
  if (!isFinite(num)) return '';
  return num.toLocaleString('es-MX');
}

export function parseThousands(str) {
  const digits = String(str == null ? '' : str).replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}