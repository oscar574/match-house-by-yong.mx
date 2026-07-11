// Normalize any phone to Mexican E.164 (52 + 10 digits).
// "999 123 4567" / "+52 999 123 4567" / "529991234567" -> "529991234567"
export function normalizePhoneMX(input) {
  if (input == null) return '';
  let d = String(input).replace(/\D/g, '');
  if (!d) return '';
  // Old mobile prefix: 521 + 10 digits -> 52 + 10
  if (d.length === 13 && d.startsWith('521')) d = '52' + d.slice(3);
  // US-style leading 1
  if (d.length === 11 && d.startsWith('1')) d = '52' + d.slice(1);
  if (d.length === 12 && d.startsWith('52')) return d;
  if (d.length === 10) return '52' + d;
  return d; // best-effort for unexpected formats (still deterministic)
}

export function isValidMX(normalized) {
  return /^\d{12}$/.test(normalized || '') && (normalized || '').startsWith('52');
}

export function formatPhoneDisplay(normalized) {
  const d = (normalized || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('52')) {
    const p = d.slice(2); // 10 digits
    return `+52 ${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 10)}`;
  }
  return normalized || '';
}