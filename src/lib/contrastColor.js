// Returns the text color (#FFFFFF or #1A1A1A) that gives the best contrast
// over a given hex background color, using WCAG relative luminance.
export function contrastTextColor(hex) {
  if (!hex) return '#1A1A1A';
  const c = String(hex).replace('#', '');
  if (c.length !== 6) return '#1A1A1A';
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? '#1A1A1A' : '#FFFFFF';
}

// WCAG contrast ratio between two hex colors.
export function contrastRatio(hexA, hexB) {
  const lum = (hex) => {
    if (!hex) return 0;
    const c = String(hex).replace('#', '');
    if (c.length !== 6) return 0;
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const L1 = lum(hexA);
  const L2 = lum(hexB);
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}