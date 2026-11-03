# Edgehomes lead-api — WhatsApp & Instagram chatbot, lead sheet, follow-ups, campaigns

The back end for **Edgehomes Architects** (Faridabad · Delhi NCR · +91 98715 22556). It lives in this
folder of the website repo; the website's `vercel.json` redirects `/lead-api/*` to `/`, so none of it is
served on the site.

**The one rule:** nothing dated is ever typed into EasySocial. Offers, deadlines, price bands, muhurats
and holiday hours live in `lib/calendar.js`; every bot reply and follow-up reads from it.

| Part | Where | Job |
|---|---|---|
| Server | Vercel project `edgehomes-lead-api`, root `lead-api`, `https://api.edgehomesarchitects.in` | Concierge replies, webhook, follow-up sender, tag sync, campaign push |
| Channel | EasySocial (WhatsApp +91 98715 22556, Instagram @edgehomes_architects) | Carries the conversation; LIVE blocks call the server |
| AI | Claude Console workspace "Edgehomes", `claude-haiku-5-5`, monthly cap | Only for messages the rules miss |
| Database + timer | Google Sheet "Edgehomes Leads" + Apps Script | One row per lead, follow-ups every 10 min, logs |
| Optional | `n8n/` | Meta instant forms, Google lead forms, person-waiting alert, 9 PM scoreboard |

## Endpoints
| Path | Called by | Notes |
|---|---|---|
| `GET /api/es/concierge?intent=<topic>&key=…&message=[last_message]&phone=[contact_number]&name=[name]&leadId=[leadId]&platform=whatsapp` | EasySocial LIVE blocks | Fixed topic from the calendar, no AI. Topics: greeting, offer, price, timings, location, services, process, pooja_room, feature_wall, construction, renovation, portfolio, contact, snag_check, visit_or_plan, call_request, human, timeline |
| Same URL without `intent` | EasySocial "AI CONCIERGE" block (unmatched messages) | Rules → Claude → menu. `&format=text` returns plain text; `&debug=1` adds the source |
| `GET/POST /api/es/webhook` | EasySocial Settings → Webhooks (field `messages`) | Logs every WhatsApp message with Meta ad referral data |
| `POST /api/es/followup-send`, `/api/es/followup-sync` | The sheet's FollowupRunner | DRY RUN until `FOLLOWUP_LIVE=1` |
| `POST /api/es/campaign-push` | 4SYSTMS, with `x-api-key: CAMPAIGN_PUSH_KEY` | Preview by default; live needs `CAMPAIGN_LIVE=1` + `live:true` + `confirm:<id>` |
| `POST /api/lead` | Website form, n8n | Normalise, score, log, return the tagged WhatsApp link |
| `GET /api/health` | Anyone | Which settings are present (never their values) |

## EasySocial set-up for Edgehomes

**Webhook:** `https://api.edgehomesarchitects.in/api/es/webhook`, verify token = `ES_WEBHOOK_VERIFY_TOKEN`, field `messages`.

**Two chatflows** — "Edgehomes WA Concierge" and "Edgehomes IG Concierge" — with the same blocks:

| Block | Type | Content |
|---|---|---|
| Welcome | Basic Message → LIVE GREETING | Evergreen line only; the LIVE block adds any current offer |
| Menu | Buttons | Home interiors · Pooja room / feature wall · Build on my plot · See prices · Book a consultation · Talk to designer |
| For each topic: `<TOPIC> KEYWORDS` | Basic Message, Navigation by Keywords on, Jump on, Re-send off | One short line, e.g. "Here's how it works" |
| `LIVE <TOPIC>` | API Basic Message → concierge URL with `intent=<topic>` | Jump on, Save user input off |
| Topic button blocks | Evergreen text only (no dates, offers or hours), keywords cleared | Every button that opened the topic now opens LIVE first |
| Unmatched | → "AI CONCIERGE" API Basic Message (URL without `intent`) | Fallback text: call +91 98715 22556, or type PRICE, POOJA, WALL, BUILD, VISIT |
| Human Handover | Assign to desk | Triggered by "talk to designer", call requests, complaints |

Topic keywords (English + Hinglish, ~10 each):
- **price**: price, cost, rate, budget, kitna, kitne ka, lagega, estimate, quote, charges
- **services**: services, what do you do, interiors, kitchen, wardrobe, false ceiling, lighting, kya karte ho, kaam, furniture
- **pooja_room**: pooja, puja, mandir, temple, pooja room, mandir design, ghar ka mandir, carving, brass, vastu mandir
- **feature_wall**: feature wall, mirror, mosaic, relief, wall design, accent wall, backlit, statement wall, deewar, wall art
- **construction**: construction, plot, build, house, ghar banana, naksha, elevation, architect, gaj, kothi
- **process**: process, steps, how it works, kaise, procedure, timeline, kitne din, kab tak, design process, 3d
- **timings**: timing, time, open, hours, sunday, kab khulta, band, closed, today, aaj
- **location**: location, address, where, kahan, map, studio, office, directions, pin, faridabad
- **offer**: offer, deal, discount, scheme, festive, diwali, sale, promo, chhoot, current offer
- **visit_or_plan**: visit, book, appointment, consultation, meet, site visit, milna, aana, slot, floor plan

**Tags** (≤ 20 characters; ids go in `ES_TAG_IDS`): `SUPPRESS_OPT_OUT`, `SUPPRESS_MARKETING`, `SUPPRESS_CLIENT`, `SUPPRESS_ACQUISITION`, `SUPPRESS_HUMAN_PAUSE` (set only by followup-sync), plus `SRC_*` sources, `CMP_<CAMPAIGN>_<YEAR>`, `INTEREST_POOJA`, `INTEREST_WALL`, `PROPERTY_PLOT`, `NEEDS_HUMAN`, `NEEDS_ADDRESS`.

**Templates:** the 20 drafts in `data/followup-templates.csv` (kind = template). Insert variables with *Add Variable* and type the rest; keep offers and hours in separate templates; Hinglish versions end `_hinglish`.

**Campaigns:** for each reusable campaign, *Broadcast → Create API campaign* on an approved template, copy its cURL into `ES_CAMPAIGNS["<id>"]`, and register it in `lib/campaign-registry.js`. Follow-up templates use ids `fu_<template>`.

## Deploy
1. Vercel → Add New → Project → import `Goluman23/EdgeHomes` → **Root Directory `lead-api`**, framework Other, no build command.
2. Add the variables in `.env.example` (the client pastes keys), then redeploy from a git push.
3. Settings → Domains → `api.edgehomesarchitects.in` → add the CNAME at the domain's DNS.
4. Open `/api/health`.
5. Sheet: Apps Script with `apps-script/Code.gs`, `FollowupEngine.gs`, `FollowupRunner.gs`; Script properties `SHEET_LOG_SECRET`, `API_BASE`, `DESIGNER`, `DESK_EMAIL`; run `setupSheet`, then `installTrigger`; deploy as web app.

## Develop
```bash
cd lead-api
npm test            # 41 tests
npm run build:gs    # after editing lib/{time,calendar,stages,followups}.js, re-paste FollowupEngine.gs
npm run check       # tests + stale-engine check
python3 tools/build_workbook.py   # templates CSV + setup workbook from tools/content.py
```
Branch per change, PR, merge; Vercel deploys `main`.

## Go-live (on the client's go only)
`npm test` green · `/api/health` all Day-1 settings present · real WhatsApp + Instagram test of hi / price / pooja / timings / location / a random sentence · no festival names or dates in any flow block · templates approved and mapped · `FOLLOWUP_LIVE=1`, `CAMPAIGN_LIVE=1` · sheet menu → Reset dry-run marks · EasySocial's own 30-minute WhatsApp reminder off.

Docs: `docs/EDGE-HOMES-IMPLEMENTATION-BRIEF.md`, `docs/EdgeHomes_Setup_Workbook.xlsx`, `docs/FOLLOWUPS.md`, `docs/strategy/`.
