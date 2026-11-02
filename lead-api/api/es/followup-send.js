// POST /api/es/followup-send — called by the sheet's FollowupRunner every 10 minutes.
// Body: { secret, lead_id, phone, subscriber_id?, channel, tpl, vars[], step }
// DRY RUN until FOLLOWUP_LIVE=1: returns what would be sent and sends nothing.
import { send, body, keyOk } from '../../lib/http.js';
import { isLive } from '../../lib/config.js';
import { normalizePhone } from '../../lib/phone.js';
import { provider } from '../../lib/providers/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!keyOk(req, 'SHEET_LOG_SECRET')) return send(res, 401, { error: 'bad key' });
  const b = body(req);
  const phone = normalizePhone(b.phone);
  if (!b.tpl) return send(res, 400, { error: 'tpl required' });
  if (b.channel === 'ig') return send(res, 422, { error: 'Instagram follow-ups are desk tasks; the send API covers WhatsApp only' });
  if (!phone && !b.subscriber_id) return send(res, 400, { error: 'phone or subscriber_id required' });
  const job = { phone, subscriberId: b.subscriber_id || null, tpl: b.tpl, vars: Array.isArray(b.vars) ? b.vars : [] };
  if (!isLive()) return send(res, 200, { ok: true, dryRun: true, wouldSend: { ...job, step: b.step, lead_id: b.lead_id } });
  const r = await provider().sendTemplate(job);
  send(res, r.ok ? 200 : 502, { ok: r.ok, dryRun: false, provider: process.env.PROVIDER || 'easysocial', result: r });
}
