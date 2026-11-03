// /api/es/webhook — WhatsApp messages webhook (EasySocial forwards Meta's WhatsApp payload).
// GET  = Meta verification (hub.challenge).  POST = log every inbound message with intent + source.
// It does not reply — the inbox bot replies; this keeps the one journey record up to date.
import crypto from 'node:crypto';
import { send } from '../../lib/http.js';
import { classify } from '../../lib/intent.js';
import { resolveSource } from '../../lib/source.js';
import { normalizePhone } from '../../lib/phone.js';
import { logToSheet } from '../../lib/sheet.js';

// Read the raw stream first (needed for signature checks); fall back to a parsed body.
async function rawBody(req) {
  if (typeof req[Symbol.asyncIterator] === 'function' && !req.readableEnded) {
    const chunks = []; for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    if (chunks.length) return Buffer.concat(chunks).toString('utf8');
  }
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  return '';
}

export function signatureOk(raw, header) {
  const secret = process.env.ES_APP_SECRET;
  if (!secret) return true; // optional: set ES_APP_SECRET when the provider signs payloads
  const want = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(String(header || '')), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Flatten Meta's WhatsApp payload into simple events. */
export function extractEvents(payload) {
  const events = [];
  for (const entry of payload.entry || []) for (const ch of entry.changes || []) {
    const v = ch.value || {};
    const names = Object.fromEntries((v.contacts || []).map(c => [c.wa_id, c.profile?.name || '']));
    for (const m of v.messages || []) {
      const text = m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
      events.push({ phone: normalizePhone(m.from), name: names[m.from] || '', id: m.id, type: m.type, text, ts: Number(m.timestamp || 0) * 1000, referral: m.referral || null });
    }
    for (const s of v.statuses || []) events.push({ status: s.status, id: s.id, phone: normalizePhone(s.recipient_id), ts: Number(s.timestamp || 0) * 1000, errors: s.errors || null });
  }
  return events;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] && q['hub.verify_token'] === process.env.ES_WEBHOOK_VERIFY_TOKEN) {
      res.statusCode = 200; return res.end(String(q['hub.challenge'] || ''));
    }
    return send(res, 403, { error: 'verification failed' });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const raw = await rawBody(req);
  if (!signatureOk(raw, req.headers['x-hub-signature-256'])) return send(res, 401, { error: 'bad signature' });
  let payload = {}; try { payload = JSON.parse(raw || '{}'); } catch {}
  const events = extractEvents(payload);
  for (const e of events) {
    if (e.status) { if (e.status === 'failed') await logToSheet('wa_status', e); continue; }
    const c = classify(e.text, {});
    const src = resolveSource({ text: e.text, referral: e.referral, channel: 'wa' });
    await logToSheet('wa_message', { ...e, intent: c.intent, handoff: c.handoff, source: src.tag, sourceCode: src.code, city: src.city, sourceDetail: src.detail, adHeadline: e.referral?.headline || '' });
  }
  send(res, 200, { ok: true, events: events.length });
}
