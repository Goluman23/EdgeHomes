// Normalised Indian mobile = the identity key across WhatsApp, forms and the sheet.
export function normalizePhone(raw) {
  if (raw == null) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('0091')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) d = '91' + d;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
}
export const prettyPhone = p => (p ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : '');
