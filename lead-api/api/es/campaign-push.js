// POST /api/es/campaign-push — push a contact list into a named EasySocial API campaign.
// Header x-api-key: $CAMPAIGN_PUSH_KEY. Body: { campaign: 'referral', contacts: [{phone, name, stage, consent, group}],
//   sent_before?: [phones], live?: true, confirm?: '<campaign id>' }
// PREVIEW by default: returns who would be sent and why each skipped contact was dropped.
// Live needs all three: CAMPAIGN_LIVE=1 in Vercel, live:true, and confirm equal to the campaign id. Batches of 100.
import { send, body, keyOk } from '../../lib/http.js';
import { findCampaign } from '../../lib/campaign-registry.js';
import { filterList } from '../../lib/contacts.js';
import { normalizePhone } from '../../lib/phone.js';
import { parseCurl, fillRequest } from '../../lib/curl.js';
import { jsonEnv } from '../../lib/providers/env.js';
import { logToSheet } from '../../lib/sheet.js';


export default async function handler(req, res, { fetchImpl = fetch } = {}) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!keyOk(req, 'CAMPAIGN_PUSH_KEY')) return send(res, 401, { error: 'bad key' });
  const b = body(req);
  const campaign = findCampaign(b.campaign);
  if (!campaign) return send(res, 404, { error: `unknown campaign "${b.campaign}"` });
  const contacts = Array.isArray(b.contacts) ? b.contacts.slice(0, 5000) : [];
  const sentBefore = new Set((b.sent_before || []).map(normalizePhone).filter(Boolean));
  const { keep, dropped } = filterList(contacts, campaign, sentBefore);
  const reasons = dropped.reduce((m, d) => (m[d.why] = (m[d.why] || 0) + 1, m), {});
  const summary = { campaign: campaign.id, template: campaign.template, total: contacts.length, eligible: keep.length, dropped: dropped.length, reasons };
  const live = process.env.CAMPAIGN_LIVE === '1' && b.live === true && b.confirm === campaign.id;
  if (!live) return send(res, 200, { ok: true, preview: true, ...summary, sample: keep.slice(0, 10), droppedList: dropped.slice(0, 200) });
  const curl = jsonEnv('ES_CAMPAIGNS')[campaign.id];
  if (!curl) return send(res, 422, { error: `ES_CAMPAIGNS has no cURL for ${campaign.id}` });
  const tpl = parseCurl(curl);
  const results = [];
  for (let i = 0; i < keep.length; i += 100) {
    const batch = keep.slice(i, i + 100);
    for (const c of batch) {
      const r = fillRequest(tpl, { phone: c.phone, name: c.name, vars: [c.name] });
      try {
        const resp = await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body == null ? undefined : typeof r.body === 'string' ? r.body : JSON.stringify(r.body) });
        results.push({ phone: c.phone, ok: resp.ok, status: resp.status });
      } catch (e) { results.push({ phone: c.phone, ok: false, error: String(e.message || e) }); }
    }
    await logToSheet('campaign_log', { campaign: campaign.id, rows: results.slice(i, i + 100) });
  }
  send(res, 200, { ok: true, preview: false, ...summary, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok) });
}
