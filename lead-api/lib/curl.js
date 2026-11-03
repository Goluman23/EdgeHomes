// Parse the cURL that EasySocial generates for an API campaign (Broadcast → Create API campaign)
// into { url, method, headers, body }, then fill one contact into it.
export function parseCurl(cmd) {
  const src = String(cmd || '').replace(/\\\r?\n/g, ' ');
  const tokens = [];
  const re = /'([^']*)'|"((?:[^"\\]|\\.)*)"|(\S+)/g;
  let m;
  while ((m = re.exec(src))) tokens.push(m[1] != null ? m[1] : m[2] != null ? m[2].replace(/\\"/g, '"') : m[3]);
  const out = { url: '', method: 'GET', headers: {}, body: null };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'curl') continue;
    if (t === '-X' || t === '--request') { out.method = tokens[++i].toUpperCase(); continue; }
    if (t === '-H' || t === '--header') { const h = tokens[++i]; const k = h.indexOf(':'); out.headers[h.slice(0, k).trim().toLowerCase()] = h.slice(k + 1).trim(); continue; }
    if (/^(-d|--data|--data-raw|--data-binary)$/.test(t)) { out.body = tokens[++i]; if (out.method === 'GET') out.method = 'POST'; continue; }
    if (/^https?:\/\//.test(t)) out.url = t;
  }
  if (out.body) { try { out.body = JSON.parse(out.body); } catch { /* keep string */ } }
  return out;
}

const PHONE_KEYS = ['phone', 'phone_number', 'phoneNumber', 'mobile', 'number', 'to', 'contact_number', 'whatsapp_number'];
const NAME_KEYS = ['name', 'full_name', 'fullName', 'first_name', 'contact_name'];

/** Fill one contact into a parsed campaign request. Variables replace {{1}}, {{2}}… in order. */
export function fillRequest(req, { phone, name, vars = [] }) {
  const sub = s => String(s)
    .replace(/\{\{\s*(phone|phone_number|mobile|number)\s*\}\}|<phone[^>]*>|PHONE_NUMBER/gi, phone)
    .replace(/\{\{\s*(name|first_name)\s*\}\}|<name[^>]*>|CONTACT_NAME/gi, name || 'there')
    .replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i) => vars[Number(i) - 1] != null ? String(vars[Number(i) - 1]) : `{{${i}}}`);
  const walk = v => {
    if (typeof v === 'string') return sub(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) {
        if (PHONE_KEYS.includes(k) && (typeof x === 'string' || typeof x === 'number')) o[k] = phone;
        else if (NAME_KEYS.includes(k) && typeof x === 'string') o[k] = name || 'there';
        else o[k] = walk(x);
      }
      return o;
    }
    return v;
  };
  return { url: sub(req.url), method: req.method, headers: req.headers, body: req.body == null ? null : walk(req.body) };
}
