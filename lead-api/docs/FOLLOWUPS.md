# Follow-ups — how the engine decides

Source: `lib/followups.js` (compiled to `apps-script/FollowupEngine.gs` by `npm run build:gs`).
The Google Sheet runs `runFollowups()` every 10 minutes and takes **one** action per lead per run.

## Actions
| Action | Meaning |
|---|---|
| send | POST `/api/es/followup-send` (dry run until `FOLLOWUP_LIVE=1`) |
| task | Writes `TASK: …` in *Next step* and emails `DESK_EMAIL` |
| move | Engine moves the stage (e.g. → nurture) and syncs tags |
| skip | Step no longer valid (24-h window closed, no consent, moment passed) — logged |
| wait | Shows the next step and when it is due |
| done | Nothing left for this stage |

## Cadence by stage
| Stage | Steps |
|---|---|
| new / qualifying | +30 min session nudge · +2 h cost-guide offer (session) · IG only: +22 h desk task "last chance" · d1 `eh_fu_d1_guide` · d3 `eh_fu_d3_proof` · d6 `eh_fu_d6_muhurat` · d8 → nurture |
| qualified | task now: designer call within 24 h · d1 `eh_q_slots` · d3 proof · d6 muhurat · d9 → nurture |
| visit_booked | `eh_visit_confirm` now · `eh_visit_reminder_eve` 7 PM day before · `eh_visit_reminder_2h` · task 30 min after: mark Walked in / No-show |
| no_show | task +30 min rebook call · d1 `eh_visit_rebook` · d4 → nurture |
| walked_in | task: send 3D same day · task d2: proposal · task d3: founder call · d5 `eh_post_visit_ask` |
| proposal | d2 `eh_proposal_followup` · task d4 founder call · task d7 decision meeting |
| signed | `eh_welcome_signed` · task d2 kick-off |
| nurture | d30, d60, d90 `eh_nurture_monthly` |
| client, past_client, lost, opted_out, not_lead | nothing automated |

## Guards
- Any reply restarts new / qualified / nurture from the reply time.
- Session messages only within 24 h of the lead's last message.
- Marketing templates need `Consent = YES` (with a consent source); utility templates don't.
- Instagram: session nudges run in the inbox bot; templates become desk tasks within 7 days (human-agent tag), skipped after.
- Human pause (48 h after a person/call/complaint request) stops everything except visit reminders. A desk stage change clears it.
- Send window 9:30 AM – 8:30 PM IST; quiet days 8 Nov, 25 Dec, 1 Jan move steps to the next day 10 AM.
- Reminders whose moment has passed (e.g. booked at 3 PM for 6 PM) are skipped, not sent late.

## Attribution
Every send records the template as the lead's *last template*. A reply within 48 h, a booking and a signature are credited to it in **Follow-up stats**, with *Signed value (₹)* as revenue.

## Go-live
1. Templates approved and mapped (`ES_CAMPAIGNS` or `MC_FLOWS`).
2. Vercel: `FOLLOWUP_LIVE=1` → push a commit (env changes need a fresh deploy).
3. Sheet: menu **Edge Homes → Reset dry-run marks** so dry-run "sends" don't block real ones.
4. Turn off the inbox's own WhatsApp 30-minute reminder.
