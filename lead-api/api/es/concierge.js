// /api/es/concierge — EasySocial calls this from two kinds of chatflow block:
//   1. LIVE <TOPIC> blocks (API Basic Message), fixed topic, no AI:
//      GET /api/es/concierge?intent=price&key=<CONCIERGE_KEY>&message=[last_message]&phone=[contact_number]&name=[name]&leadId=[leadId]&platform=whatsapp
//   2. The AI CONCIERGE block for unmatched messages: same URL without intent= — rules first, then Claude.
// Also accepts POST JSON { text|message, phone, name, channel|platform, stage, waiting_for_human, last_text }
// with header x-concierge-key. Every answer that depends on the date is built here from lib/calendar.js.
// Response: JSON (reply + aliases + buttons). Add &format=text to get the reply as plain text.
import { send, body, keyOk } from '../../lib/http.js';
import { respond, TOPICS } from '../../lib/concierge.js';
import { normalizePhone } from '../../lib/phone.js';
import { logToSheet } from '../../lib/sheet.js';

// EasySocial leaves a variable as literal text ("[last_message]") when it has no value.
const clean = v => { const s = String(v == null ? '' : v).trim(); return /^\[[a-z_]+\]$/i.test(s) ? '' : s; };

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'GET or POST' });
  if (!keyOk(req, 'CONCIERGE_KEY')) return send(res, 401, { error: 'bad key' });
  const q = req.query || {};
  const b = req.method === 'POST' ? body(req) : {};
  const pick = (...k) => { for (const x of k) { const v = clean(b[x] != null ? b[x] : q[x]); if (v) return v; } return ''; };
  const text = pick('text', 'message', 'n8n_input_message').slice(0, 2000);
  const platform = pick('channel', 'platform').toLowerCase();
  const channel = /^(ig|instagram)$/.test(platform) ? 'ig' : 'wa';
  const intent = pick('intent').toLowerCase();
  const out = await respond({
    text, intent: TOPICS.includes(intent) ? intent : '', name: pick('name'), channel, stage: pick('stage') || 'new',
    waitingForHuman: pick('waiting_for_human') === 'true', lastText: pick('last_text'),
  });
  await logToSheet('concierge', {
    phone: normalizePhone(pick('phone', 'contact_number')), ig: pick('ig_handle', 'username'), leadId: pick('leadId', 'lead_id'),
    name: pick('name'), channel, text, topic: intent, intent: out.intent, reply: out.text, handoff: out.handoff,
    stage: out.stage || '', tags: out.tags || [], pauseHours: out.pauseHours || 0, source: out.source,
  });
  if (pick('format') === 'text') { res.statusCode = 200; res.setHeader('content-type', 'text/plain; charset=utf-8'); return res.end(out.text || ''); }
  const debug = pick('debug') === '1';
  send(res, 200, {
    reply: out.text, message: out.text, text: out.text, buttons: out.buttons || [], intent: out.intent, handoff: out.handoff,
    set_stage: out.stage || null, tags: out.tags || [], ask_phone: !!out.askPhone, silent: !!out.silent,
    ...(debug ? { debug: { source: out.source, lang: out.lang, topic: intent || null } } : {}),
  });
}
