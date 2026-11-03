// POST /api/es/followup-sync — keeps the inbox in step with the sheet: SUPPRESS_* tags and
// the eh_journey_stage field. Body: { secret, phone, subscriber_id?, stage, paused_until? }
// DRY RUN until FOLLOWUP_LIVE=1.
import { send, body, keyOk } from '../../lib/http.js';
import { isLive } from '../../lib/config.js';
import { normalizePhone } from '../../lib/phone.js';
import { STAGES, suppressionDiff } from '../../lib/stages.js';
import { provider } from '../../lib/providers/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!keyOk(req, 'SHEET_LOG_SECRET')) return send(res, 401, { error: 'bad key' });
  const b = body(req);
  if (!STAGES[b.stage]) return send(res, 400, { error: `unknown stage ${b.stage}` });
  const phone = normalizePhone(b.phone);
  const diff = suppressionDiff(b.stage, { pausedUntil: Number(b.paused_until || 0) });
  const plan = { phone, subscriberId: b.subscriber_id || null, stage: b.stage, ...diff };
  if (!isLive()) return send(res, 200, { ok: true, dryRun: true, plan });
  const p = provider();
  const tags = await p.setTags({ phone, subscriberId: plan.subscriberId, add: diff.add, remove: diff.remove });
  const field = await p.setField({ phone, subscriberId: plan.subscriberId, name: 'eh_journey_stage', value: b.stage });
  send(res, tags.ok && field.ok ? 200 : 502, { ok: tags.ok && field.ok, plan, tags, field });
}
