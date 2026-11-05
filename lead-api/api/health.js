import { send } from '../lib/http.js';
import { isLive, BRAND } from '../lib/config.js';
import { CALENDAR_VERSION, seasonAt } from '../lib/calendar.js';

export default function handler(req, res) {
  const has = k => Boolean(process.env[k]);
  send(res, 200, {
    ok: true, service: 'edgehomes-lead-api', brand: 'Edgehomes Architects', live: isLive(), campaignLive: process.env.CAMPAIGN_LIVE === '1', provider: process.env.PROVIDER || 'easysocial',
    calendar: CALENDAR_VERSION, season: seasonAt(Date.now()).id,
    confirmed: { studioAddress: !!BRAND.studioAddress, hours: !!BRAND.hours },
    env: Object.fromEntries(['META_PIXEL_ID', 'META_CAPI_TOKEN', 'CONCIERGE_KEY', 'SHEET_LOG_URL', 'SHEET_LOG_SECRET', 'ANTHROPIC_API_KEY', 'ES_WEBHOOK_VERIFY_TOKEN',
      'ES_APP_SECRET', 'ES_AUTH_KEY', 'ES_ACCESS_TOKEN', 'ES_TAG_IDS', 'ES_CAMPAIGNS', 'CAMPAIGN_PUSH_KEY', 'MC_API_KEY', 'MC_FLOWS', 'LEAD_API_KEY'].map(k => [k, has(k)])),
  });
}
