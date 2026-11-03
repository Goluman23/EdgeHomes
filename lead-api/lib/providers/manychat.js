// ManyChat public API (https://api.manychat.com). Templates live inside ManyChat flows:
// map each template key to a flow namespace in MC_FLOWS. Nothing runs unless FOLLOWUP_LIVE=1.
import { jsonEnv } from './env.js';

const API = 'https://api.manychat.com';
const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${process.env.MC_API_KEY || ''}` });

async function call(method, path, payload, fetchImpl = fetch) {
  const res = await fetchImpl(API + path, { method, headers: headers(), body: payload ? JSON.stringify(payload) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { ok: res.ok && (!data || data.status !== 'error'), status: res.status, data };
}

/** Find a subscriber by WhatsApp phone (verify endpoint availability on your plan during the audit). */
export async function findSubscriber(phone, fetchImpl) {
  const r = await call('GET', `/fb/subscriber/findBySystemField?phone=%2B${phone}`, null, fetchImpl);
  return r.ok && r.data && r.data.data ? r.data.data.id : null;
}

async function sid({ subscriberId, phone }, fetchImpl) {
  return subscriberId || (phone ? await findSubscriber(phone, fetchImpl) : null);
}

export async function sendTemplate({ subscriberId, phone, tpl }, fetchImpl) {
  const flows = jsonEnv('MC_FLOWS');
  if (!flows[tpl]) return { ok: false, error: `no ManyChat flow mapped for ${tpl} (MC_FLOWS)` };
  const id = await sid({ subscriberId, phone }, fetchImpl);
  if (!id) return { ok: false, error: 'subscriber not found' };
  return call('POST', '/fb/sending/sendFlow', { subscriber_id: id, flow_ns: flows[tpl] }, fetchImpl);
}

export async function setTags({ subscriberId, phone, add = [], remove = [] }, fetchImpl) {
  const id = await sid({ subscriberId, phone }, fetchImpl);
  if (!id) return { ok: false, error: 'subscriber not found' };
  const results = [];
  for (const t of add) results.push(await call('POST', '/fb/subscriber/addTagByName', { subscriber_id: id, tag_name: t }, fetchImpl));
  for (const t of remove) results.push(await call('POST', '/fb/subscriber/removeTagByName', { subscriber_id: id, tag_name: t }, fetchImpl));
  return { ok: results.every(r => r.ok), results };
}

export async function setField({ subscriberId, phone, name, value }, fetchImpl) {
  const id = await sid({ subscriberId, phone }, fetchImpl);
  if (!id) return { ok: false, error: 'subscriber not found' };
  return call('POST', '/fb/subscriber/setCustomFieldByName', { subscriber_id: id, field_name: name, field_value: value }, fetchImpl);
}
