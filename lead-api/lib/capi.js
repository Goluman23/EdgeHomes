// Meta Conversions API (server-side events) for the Edgehomes website dataset.
// - Lead: sent from /api/lead with the same event_id the browser Pixel used, so Meta de-duplicates.
// - Stage events (lead quality feedback): sent from /api/es/followup-sync when the desk moves a lead,
//   so ads learn which leads book visits and sign, not just which ones fill forms.
// Needs META_PIXEL_ID + META_CAPI_TOKEN (Vercel, Sensitive). Without them every call is a no-op.
// META_TEST_EVENT_CODE (optional) routes events to Events Manager → Test events.
import crypto from 'node:crypto';

const GRAPH = () => process.env.META_GRAPH_VERSION || 'v21.0';
export const capiConfigured = () => Boolean(process.env.META_PIXEL_ID && process.env.META_CAPI_TOKEN);

// Journey stage → Meta event. Custom names are fine for optimisation and custom conversions.
export const STAGE_EVENTS = {
  qualified: 'QualifiedLead',
  visit_booked: 'Schedule',
  walked_in: 'VisitCompleted',
  proposal: 'ProposalSent',
  signed: 'Purchase',
};

export const sha256 = v => (v == null || v === '' ? undefined
  : crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex'));

const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** fbc from a raw fbclid when the browser cookie is missing (Meta's documented format). */
export function fbcFrom({ fbc, fbclid, at = Date.now() }) {
  if (fbc) return fbc;
  return fbclid ? `fb.1.${at}.${fbclid}` : undefined;
}

/**
 * Build one CAPI event. lead: { phone (91XXXXXXXXXX), email, name, city, metaLeadId }
 * ctx: { ip, ua, url, fbp, fbc, fbclid } — browser context, absent for system events.
 */
export function buildEvent({ name, eventId, time = Date.now(), lead = {}, ctx = {}, custom = {}, source = 'website' }) {
  const [first, ...rest] = String(lead.name || '').trim().split(/\s+/);
  const user = clean({
    ph: lead.phone ? [sha256(lead.phone)] : undefined,
    em: lead.email ? [sha256(lead.email)] : undefined,
    fn: first ? [sha256(first)] : undefined,
    ln: rest.length ? [sha256(rest.join(' '))] : undefined,
    ct: lead.city ? [sha256(String(lead.city).replace(/\s+/g, ''))] : undefined,
    country: [sha256('in')],
    external_id: lead.phone ? [sha256(lead.phone)] : undefined,
    lead_id: lead.metaLeadId || undefined,
    client_ip_address: ctx.ip,
    client_user_agent: ctx.ua,
    fbp: ctx.fbp,
    fbc: fbcFrom({ fbc: ctx.fbc, fbclid: ctx.fbclid, at: time }),
  });
  return clean({
    event_name: name,
    event_time: Math.floor(time / 1000),
    event_id: eventId,
    action_source: source,
    event_source_url: source === 'website' ? ctx.url : undefined,
    user_data: user,
    custom_data: Object.keys(custom).length ? clean(custom) : undefined,
  });
}

/** POST events to Meta. Never throws; returns { ok, skipped?, status?, body? }. */
export async function sendCapi(events, { fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  if (!capiConfigured()) return { ok: false, skipped: 'META_PIXEL_ID / META_CAPI_TOKEN not set' };
  const url = `https://graph.facebook.com/${GRAPH()}/${process.env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`;
  const payload = clean({ data: events, test_event_code: process.env.META_TEST_EVENT_CODE });
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  } finally { clearTimeout(t); }
}

/** Client IP and user agent from a Vercel request. */
export function requestContext(req) {
  const h = req.headers || {};
  const ip = String(h['x-forwarded-for'] || h['x-real-ip'] || '').split(',')[0].trim() || undefined;
  return { ip, ua: h['user-agent'] || undefined };
}
