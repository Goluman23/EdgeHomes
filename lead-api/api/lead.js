// POST /api/lead — website forms, Meta instant forms (via n8n), society QR forms, partners.
// Normalises, scores, logs to the sheet (one record per phone) and returns the WhatsApp next step.
// Auth: website calls are CORS-limited to ALLOWED_ORIGINS; server-to-server calls (n8n) send x-api-key: $LEAD_API_KEY.
import { send, body, cors, keyOk } from '../lib/http.js';
import { normalizePhone } from '../lib/phone.js';
import { scoreLead } from '../lib/score.js';
import { parseSourceTag, CITY_CODES } from '../lib/source.js';
import { logToSheet } from '../lib/sheet.js';
import { BRAND } from '../lib/config.js';

const SRC = { website: 'SRC_WEBSITE', meta_form: 'SRC_META_FORM', google: 'SRC_GOOGLE', society_qr: 'SRC_SOCIETY_QR', partner: 'SRC_PARTNER', referral: 'SRC_REFERRAL', walkin: 'SRC_WALKIN', warm_db: 'SRC_WARM_DB' };
const CITY_TO_CODE = Object.fromEntries(Object.entries(CITY_CODES).map(([k, v]) => [v.toLowerCase(), k]));

export function buildLead(b) {
  const phone = normalizePhone(b.phone || b.phone_number || b.mobile);
  if (!phone) return { error: 'valid Indian mobile number required' };
  const tagged = parseSourceTag(b.source_tag || '');
  const city = b.city ? String(b.city).trim().replace(/^\w/, c => c.toUpperCase()) : (tagged && tagged.city) || '';
  const s = scoreLead({ possession: b.possession, budget: b.budget, city, property: b.property, floorPlan: !!b.floor_plan });
  const source = (tagged && tagged.tag) || SRC[b.source] || 'SRC_WEBSITE';
  const code = CITY_TO_CODE[city.toLowerCase()] || 'WEB';
  return {
    phone, name: String(b.name || b.full_name || '').slice(0, 80), email: String(b.email || '').slice(0, 120),
    city, society: b.society || '', property: b.property || '', possession: s.possession, budget: s.budget,
    score: s.score, tier: s.tier, qualified: s.qualified, stage: s.qualified ? 'qualified' : 'qualifying',
    source, sourceDetail: b.campaign || b.form_name || (tagged && tagged.detail) || '', campaign: b.campaign || '', adset: b.adset || '', ad: b.ad || '',
    consent: b.consent === true || b.consent === 'true' || b.consent === 'yes', consentSource: b.consent_source || (b.consent ? `${source} form` : ''),
    utm: b.utm || null,
    wa: `https://wa.me/${BRAND.phoneE164}?text=${encodeURIComponent(`Hi Edgehomes, I'd like to book a consultation. EH-${source === 'SRC_META_FORM' ? 'FORM' : 'WEB'}-${code}`)}`,
  };
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const fromBrowser = !!req.headers.origin;
  if (!fromBrowser && !keyOk(req, 'LEAD_API_KEY')) return send(res, 401, { error: 'bad key' });
  const b = body(req);
  if (b.website_url_hp) return send(res, 200, { ok: true }); // honeypot
  const lead = buildLead(b);
  if (lead.error) return send(res, 400, lead);
  await logToSheet('lead', lead);
  send(res, 200, { ok: true, qualified: lead.qualified, tier: lead.tier, next: lead.wa });
}
