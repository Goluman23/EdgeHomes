// Source attribution. Pre-filled wa.me text carries a tag like "EH-META-FBD" or
// "EH-QR-BPTP77"; click-to-WhatsApp ads also send a referral object.
const KIND = {
  META: 'SRC_META_CTWA', FORM: 'SRC_META_FORM', G: 'SRC_GOOGLE', GBP: 'SRC_GOOGLE_BUSINESS',
  IG: 'SRC_IG_ORGANIC', WEB: 'SRC_WEBSITE', QR: 'SRC_SOCIETY_QR', P: 'SRC_PARTNER',
  REF: 'SRC_REFERRAL', WARM: 'SRC_WARM_DB', WALK: 'SRC_WALKIN',
};
export const CITY_CODES = { FBD: 'Faridabad', GGN: 'Gurugram', NOI: 'Noida', PWL: 'Palwal', DEL: 'Delhi' };
export const SOURCE_TAGS = [...new Set(Object.values(KIND)), 'SRC_IG_DM', 'SRC_UNKNOWN'];

export function parseSourceTag(text) {
  const m = /\bEH-([A-Z]+)(?:-([A-Z0-9]+))?\b/.exec(String(text || '').toUpperCase());
  if (!m || !KIND[m[1]]) return null;
  const detail = m[2] || '';
  return { tag: KIND[m[1]], code: m[0], city: CITY_CODES[detail] || null, detail: CITY_CODES[detail] ? '' : detail };
}

/** Resolve the source of one inbound event. */
export function resolveSource({ text, referral, channel }) {
  const fromTag = parseSourceTag(text);
  if (fromTag) return fromTag;
  if (referral && (referral.ctwa_clid || referral.source_id || referral.source_type === 'ad')) {
    return { tag: 'SRC_META_CTWA', code: 'CTWA', city: null, detail: referral.source_id || '', headline: referral.headline || '' };
  }
  if (channel === 'ig') return { tag: 'SRC_IG_DM', code: 'IG', city: null, detail: '' };
  return { tag: 'SRC_UNKNOWN', code: '', city: null, detail: '' };
}

/** First source never changes; last source always updates. */
export function mergeSource(lead, src) {
  if (!src) return lead;
  const out = { ...lead };
  if (!out.firstSource || out.firstSource === 'SRC_UNKNOWN') out.firstSource = src.tag;
  if (src.tag !== 'SRC_UNKNOWN') out.lastSource = src.tag;
  if (src.city && !out.city) out.city = src.city;
  return out;
}
