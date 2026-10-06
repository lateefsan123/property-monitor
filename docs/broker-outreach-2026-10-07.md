# Broker outreach through the existing app

Broker introductions run on the app's own seller tools, in a dedicated Repeat AI
outreach account linked to the Repeat AI WhatsApp number (+353 89 961 8882).
Brokers never enter the main seller account (441421f9…), whose WhatsApp
(+971 52 687 9151) and automations stay as they are.

## What the app now supports (for everyone)

- **Status follow-ups** (Settings > Automations, off by default): when a seller
  in a custom status is due (its follow-up gap since the last touch), Repeat
  sends the template assigned to that status, then moves them to the status's
  "After a status follow-up is sent, move to" status. Anyone who has replied is
  skipped. One message per account per run, within the account's send hours,
  gap and daily limit. A failed or unconfirmed send is never retried
  automatically; it shows as failed in Activity.
- Templates can be assigned to custom statuses; templates used only for custom
  statuses don't need {{transactions}}.

## Broker setup (scripts/setup-broker-outreach.mjs)

Built from the reconciled draft campaign c7a0bcf7, so nobody is introduced twice:

| Brokers | Status | What happens |
| --- | --- | --- |
| 6 fresh (ready) | Broker – intro | Intro with the demo video and setup offer, then the follow-up 3 days later |
| 33 introduced via Chrome on 6 Oct | Broker – follow-up | One follow-up from 9 Oct, unless they replied |
| Oliver Leedham | Broker – done | Already had the video and setup help |
| Albert Michael (replied, keen) | Broker – onboarding | Never auto-messaged: help him onboard personally |
| Alex Calamari (send unverified) | Broker – review | Never auto-messaged until checked in WhatsApp |
| Diana Khouri | not imported | No WhatsApp found |

Pacing for the outreach account: 10 am–6 pm Dubai, one every 10 minutes, at most
20 a day; transaction updates and monthly reports off.

## To go live

1. Create the outreach account in the app (a person must sign up; Claude doesn't
   create accounts) and link +353 89 961 8882 under Settings > WhatsApp.
2. Grant it complimentary access (add its ID to supabase/functions/_shared/complimentary-access.js).
3. Run `node scripts/setup-broker-outreach.mjs --user-id <its ID>`.
4. In WhatsApp on the Repeat AI phone, check Alex Calamari's chat and any replies
   from the 33 that arrived before linking; mark those brokers "Broker – onboarding"
   or "Broker – done".
5. Turn on Settings > Automations > Status follow-ups in that account.

The earlier separate campaign (broker_campaigns, its page and its worker) stays a
draft and sends nothing; it's superseded by the above.
