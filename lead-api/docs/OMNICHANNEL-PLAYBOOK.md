# Edge Homes: how every channel connects (Nov 2026)

One brand line everywhere: **Edge Homes, architects · interiors · turnkey construction, since 2015. Homes, drawn & built as one.**
Phone / WhatsApp **+91 99114 46288** · Studio SCO-8, Omaxe World Street, Sector 79, Faridabad · Mon–Sat 10 AM–7 PM · PAN India.
Assets: Studio Profile `https://edgehomesarchitects.in/studio-profile.pdf` · Cost guide `https://edgehomesarchitects.in/guide/2026-cost-guide`.

## 1. After a phone call: send the Studio Profile
| Step | What happens |
|---|---|
| 1 | Send template **eh_studio_profile_share** (or `_hinglish`) from EasySocial: header = Studio Profile PDF, buttons *Share a call time* / *Visit the studio* / *Stop promotions*. Sending from EasySocial (not the phone app) tags the contact and starts the follow-up clock. |
| 2 | Tap *Share a call time* → bot asks for a time → designer confirms with **eh_call_confirm**. |
| 3 | Tap *Visit the studio* → bot's booking path (what / property / city lists → day and time). |
| 4 | No reply → **eh_profile_nudge_d2** (morning/evening), **_d5** (studio or site visit), **_d10** (last). Any reply stops the sequence. *Stop promotions* or STOP opts them out. |
| 5 | Desk sets the stage in the *Follow-ups* sheet (Booked / Visited / Signed / Lost); the engine switches sequence and sends the stage to Meta (Conversions API: QualifiedLead, Schedule, VisitCompleted, ProposalSent, Purchase). |

If you do send from the phone app instead, add the contact to EasySocial afterwards with tag `PROFILE_SENT`, otherwise no follow-ups run.

## 2. Meta ads (Facebook / Instagram)
| Ad type | Where the lead lands | First message |
|---|---|---|
| Click-to-WhatsApp | WhatsApp bot welcome list (free 72 h window) | Welcome menu → qualification lists |
| Instant form (lead ad) | EasySocial lead sync → **eh_meta_lead_welcome** within 5 min, designer calls in working hours | then the normal new-lead cadence (30 min, 3 h, day 1/3/7/14/21) |
| Website traffic | Website form → `/api/lead` (Pixel + CAPI share one event_id) | WhatsApp hand-off link |

Retargeting audiences to build in Ads Manager: website visitors 30 / 90 days, cost-guide and studio-profile viewers, Instagram engagers 60 days, video viewers 50%+, lead-form openers who did not submit. Exclude: Signed and Opted-out contacts. WhatsApp retargeting templates (**eh_retarget_plot**, **eh_retarget_nri**, **eh_warm_enquiry_reopen**) go only to contacts who opted in.

## 3. Story and status replies
- **Instagram story reply** arrives as a DM. Keywords answer it (price, location, book…); compliments and emojis (😍 🔥 ❤️ nice, wow, beautiful) get a warm reply with the menu; anything else goes to the friendly fallback with the menu.
- **WhatsApp status reply** arrives as a normal message. New contacts get the welcome list; known contacts get the keyword reply or the friendly fallback. The 24-hour window opens, so the bot and the team can reply free.
- Post status / stories with a clear prompt so replies match keywords: "Reply **PRICE** for the 2026 cost guide", "Reply **PROFILE** for our Studio Profile", "Reply **BOOK** for a site visit".

## 4. Keywords that must stay aligned on WhatsApp and Instagram
PROFILE / brochure → Studio Profile · GUIDE → cost guide · PRICE → bands with T&C · BOOK / VISIT → booking path · DESIGNER → human · REFER → 1% referral · HINDI → Hinglish · STOP → opt-out · MENU / 0 → restart.

## 5. Still to switch on (needs the owner)
`META_CAPI_TOKEN` in Vercel · GA4 measurement ID · ad account in edgehomes_1 with payment method · domain verification · Google Sheet logger · `FOLLOWUP_LIVE=1` after templates are approved.
