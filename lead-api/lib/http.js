import crypto from 'node:crypto';

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}
export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}
/** Constant-time check of a shared key sent as header or ?key= */
export function keyOk(req, envName) {
  const want = process.env[envName];
  if (!want) return false;
  const got = String(req.headers?.['x-api-key'] || req.headers?.['x-concierge-key'] || req.query?.key || body(req).secret || '');
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function cors(req, res) {
  const allow = (process.env.ALLOWED_ORIGINS || 'https://edgehomesarchitects.in,https://www.edgehomesarchitects.in').split(',');
  const origin = req.headers?.origin;
  if (origin && allow.includes(origin)) res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('vary', 'origin');
}
