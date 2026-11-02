// EasySocial (app.easysocial.io). Sends use the cURL EasySocial generates for each API campaign
// (stored in ES_CAMPAIGNS). Tag/field paths are confirmed in the EasySocial audit.
// Nothing here is called unless FOLLOWUP_LIVE=1.
import { jsonEnv } from './env.js';
import { parseCurl, fillRequest } from '../curl.js';

const base = () => (process.env.ES_API_BASE || '').replace(/\/$/, '');
const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${process.env.ES_ACCESS_TOKEN || process.env.ES_AUTH_KEY || ''}` });

async function post(path, payload, fetchImpl = fetch) {
  if (!base() || !path) return { ok: false, error: 'EasySocial endpoint not configured (ES_API_BASE / path)' };
  const res = await fetchImpl(base() + path, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
  let data = null; try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// Follow-ups send through API campaigns too: ES_CAMPAIGNS maps "fu_<template>" to that campaign's cURL.
export async function sendTemplate({ phone, tpl, vars = [] }, fetchImpl = fetch) {
  const curls = jsonEnv('ES_CAMPAIGNS');
  const curl = curls[`fu_${tpl}`] || curls[tpl];
  if (!curl) return { ok: false, error: `no EasySocial API campaign mapped for fu_${tpl} (ES_CAMPAIGNS)` };
  const r = fillRequest(parseCurl(curl), { phone, name: vars[0], vars });
  const res = await fetchImpl(r.url, { method: r.method, headers: r.headers, body: r.body == null ? undefined : typeof r.body === 'string' ? r.body : JSON.stringify(r.body) });
  let data = null; try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// Tags and the eh_journey_stage field go through EasySocial's client API (ES_ACCESS_TOKEN).
// Endpoint paths are confirmed during the EasySocial audit and set as ES_TAG_PATH / ES_FIELD_PATH.
export async function setTags({ phone, add = [], remove = [] }, fetchImpl) {
  const ids = jsonEnv('ES_TAG_IDS'); // { "SUPPRESS_OPT_OUT": "<tag id>", ... }
  const missing = [...add, ...remove].filter(t => !ids[t]);
  if (missing.length) return { ok: false, error: `ES_TAG_IDS missing: ${missing.join(', ')}` };
  return post(process.env.ES_TAG_PATH, { phone, add: add.map(t => ids[t]), remove: remove.map(t => ids[t]) }, fetchImpl);
}

export async function setField({ phone, name, value }, fetchImpl) {
  return post(process.env.ES_FIELD_PATH, { phone, field: name, value }, fetchImpl);
}
