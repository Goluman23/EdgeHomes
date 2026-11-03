// Edgehomes business facts. Values marked TO_CONFIRM come from env so they can be
// filled in on Vercel without a code change. Never invent an address or hours.
export const BRAND = {
  name: 'Edgehomes Architects',
  short: 'Edgehomes',
  tagline: 'Architects · Interiors · Constructions',
  promise: 'drawn & built as one',
  since: 2015,
  phone: '+91 98715 22556',
  phoneE164: '919871522556',
  site: 'https://edgehomesarchitects.in',
  instagram: 'https://www.instagram.com/edgehomes_architects/',
  // Studio: the website names the area only ("Faridabad, Haryana" + a Maps search link).
  // Set EH_STUDIO_ADDRESS to the full street address once confirmed; until then the bot gives the
  // area + map link and hands over for the exact pin.
  studioArea: 'Faridabad, Haryana',
  studioAddress: process.env.EH_STUDIO_ADDRESS || '',
  mapLink: process.env.EH_MAP_LINK || 'https://www.google.com/maps/search/?api=1&query=Edgehomes+Architects+Faridabad',
  // Normal hours (website footer). Holiday hours live in calendar.js SPECIAL_HOURS.
  hours: process.env.EH_HOURS || 'Mon–Sat 10 AM – 7 PM',
  email: process.env.EH_EMAIL || '',
  designer: process.env.EH_DESIGNER || 'our design lead',
  cities: ['Faridabad', 'Gurugram', 'Noida', 'Palwal', 'Delhi'],
};

// Desk replies 9 AM – 9 PM IST; automation covers nights.
export const STAFFED = { startHour: 9, endHour: 21 };
// Automated follow-ups are only sent inside this window (IST).
export const SEND_WINDOW = { startMin: 9 * 60 + 30, endMin: 20 * 60 + 30 };

export const isLive = () => process.env.FOLLOWUP_LIVE === '1';
