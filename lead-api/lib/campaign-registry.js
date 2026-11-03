// Named API campaigns. Each id must also exist in Vercel ES_CAMPAIGNS as the cURL EasySocial generated.
// rule: 'acquisition' (prospects with consent, never clients) · 'reactivation' (old enquiries, consent group C)
//       'past_client' (referral asks, group B) · 'greeting' (any consented contact, no offer) · 'society' (group D sign-ups)
// endsOn: last day the campaign may be pushed (IST). skipIf: earlier campaigns whose recipients are skipped.
export const CAMPAIGNS = [
  { id: 'warm_reopen_nov26', name: 'Warm enquiry reopen', aliases: ['warm', 'old enquiries', 'reopen'], template: 'eh_warm_enquiry_reopen', rule: 'reactivation', endsOn: '2026-11-30', skipIf: [] },
  { id: 'referral_dec26', name: 'Past-client referral', aliases: ['referral', 'past clients', 'refer'], template: 'eh_past_client_referral', rule: 'past_client', endsOn: '2026-12-31', skipIf: [] },
  { id: 'society_pack_nov26', name: 'Possession Pack — society sign-ups', aliases: ['society', 'possession pack', 'qr'], template: 'eh_possession_pack_intro', rule: 'society', endsOn: '2026-12-15', skipIf: [] },
  { id: 'diwali_greeting_26', name: 'Diwali greeting', aliases: ['diwali', 'greeting'], template: 'eh_festive_greeting', rule: 'greeting', endsOn: '2026-11-09', skipIf: [] },
];

export function findCampaign(q) {
  const s = String(q || '').toLowerCase().trim();
  return CAMPAIGNS.find(c => c.id === s || c.name.toLowerCase() === s || c.aliases.includes(s)) || null;
}
