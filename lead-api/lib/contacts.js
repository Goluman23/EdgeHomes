// List filtering for campaign pushes. Every dropped contact gets a reason the desk can read.
import { normalizePhone } from './phone.js';
import { BRAND } from './config.js';
import { ist } from './time.js';

const OWN = new Set([BRAND.phoneE164, ...(process.env.EH_OWN_NUMBERS || '').split(',').map(normalizePhone).filter(Boolean)]);

/** "Neha Sharma (old enq)" → "Neha"; no usable name → "there". */
export function firstName(raw) {
  const w = String(raw || '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^A-Za-zऀ-ॿ\s]/g, ' ').trim().split(/\s+/)[0] || '';
  if (w.length < 2 || /^(mr|mrs|ms|dr|sir|madam|client|customer|lead|unknown)$/i.test(w)) return 'there';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * contacts: [{ phone, name, stage?, consent?, group? ('A'..'F'), optedOut? }]
 * campaign: from campaign-registry.js · sentBefore: Set of phones already sent this or a skipIf campaign
 */
export function filterList(contacts, campaign, sentBefore = new Set(), now = Date.now()) {
  const keep = [], dropped = [];
  const seen = new Set();
  const drop = (c, why) => dropped.push({ phone: c.phone, name: c.name || '', why });
  if (campaign.endsOn && ist(now).ymd > campaign.endsOn) return { keep, dropped: contacts.map(c => ({ phone: c.phone, name: c.name || '', why: `campaign ended ${campaign.endsOn}` })) };
  for (const c of contacts) {
    const phone = normalizePhone(c.phone);
    if (!phone) { drop(c, 'invalid number'); continue; }
    if (seen.has(phone)) { drop(c, 'duplicate in list'); continue; }
    seen.add(phone);
    if (OWN.has(phone)) { drop(c, "Edgehomes' own number"); continue; }
    if (c.optedOut || c.stage === 'opted_out') { drop(c, 'opted out'); continue; }
    if (c.stage === 'not_lead') { drop(c, 'not a lead (job/vendor/wrong number)'); continue; }
    if (sentBefore.has(phone)) { drop(c, 'already sent this or an earlier listed campaign'); continue; }
    if (c.group === 'F') { drop(c, 'consent source unknown (group F)'); continue; }
    if (c.consent !== true && c.consent !== 'YES' && c.consent !== 'yes') { drop(c, 'no recorded consent'); continue; }
    const st = c.stage || '';
    if (campaign.rule === 'acquisition' && ['signed', 'client', 'past_client', 'visit_booked', 'walked_in', 'proposal'].includes(st)) { drop(c, `stage ${st} excluded from acquisition`); continue; }
    if (campaign.rule === 'past_client' && !(st === 'past_client' || c.group === 'B')) { drop(c, 'not a past client'); continue; }
    if (campaign.rule === 'reactivation' && (['signed', 'client', 'past_client', 'visit_booked', 'walked_in', 'proposal'].includes(st) || (c.group && c.group !== 'C'))) { drop(c, 'not an old enquiry'); continue; }
    if (campaign.rule === 'society' && c.group !== 'D') { drop(c, 'not a society sign-up'); continue; }
    keep.push({ phone, name: firstName(c.name) });
  }
  return { keep, dropped };
}
