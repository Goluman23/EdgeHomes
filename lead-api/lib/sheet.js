// Posts events to the Google Sheet logger (Apps Script web app). Never throws.
export async function logToSheet(action, payload, { fetchImpl = fetch, timeoutMs = 4000 } = {}) {
  const url = process.env.SHEET_LOG_URL;
  if (!url) return { ok: false, skipped: 'SHEET_LOG_URL not set' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST', signal: ctl.signal, redirect: 'follow',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: process.env.SHEET_LOG_SECRET || '', action, at: Date.now(), ...payload }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  } finally { clearTimeout(t); }
}
