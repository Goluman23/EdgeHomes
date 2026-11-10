// Edgehomes business facts. Values marked TO_CONFIRM come from env so they can be
// filled in on Vercel without a code change. Never invent an address or hours.
export const BRAND = {
  name: 'Edgehomes Architects',
  short: 'Edgehomes',
  tagline: 'Architects · Interiors · Constructions',
  promise: 'drawn & built as one',
  since: 2015,
  phone: '+91 99114 46288',
  phoneE164: '919911446288',
  // Studio number until 10 Nov 2026; still the studio's own line, so never treated as a lead.
  formerPhonesE164: ['919871522556'],
  site: 'https://edgehomesarchitects.in',
  instagram: 'https://www.instagram.com/edgehomes_architects/',
  // Studio address and Google Maps pin confirmed by the client (3 Nov 2026).
  studioArea: 'Faridabad, Haryana',
  studioAddress: process.env.EH_STUDIO_ADDRESS || 'SCO-8, 1st Floor, Omaxe World Street, Sector 79, Faridabad, Haryana 121101',
  mapLink: process.env.EH_MAP_LINK || 'https://maps.google.com/?cid=7041372647983848355',
  whatsappLink: 'https://wa.me/919911446288',
  serviceArea: 'PAN India (studio in Faridabad)',
  // Normal hours (website footer). Holiday hours live in calendar.js SPECIAL_HOURS.
  hours: process.env.EH_HOURS || 'Mon–Sat 10 AM – 7 PM',
  email: process.env.EH_EMAIL || '',
  designer: process.env.EH_DESIGNER || 'our design lead',
  cities: ['Faridabad', 'Gurugram', 'Noida', 'Palwal', 'Delhi'],
};

// Desk replies in studio hours, 10 AM – 7 PM IST; automation covers the rest.
export const STAFFED = { startHour: 10, endHour: 19 };
// Automated follow-ups are only sent inside this window (IST).
export const SEND_WINDOW = { startMin: 10 * 60, endMin: 19 * 60 };

export const isLive = () => process.env.FOLLOWUP_LIVE === '1';
