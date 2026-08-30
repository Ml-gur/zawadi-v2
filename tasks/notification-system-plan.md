# Implementation Plan: Scholarship Notification System

## Overview
Build a notification system that alerts users when new scholarships matching their profile are published. Uses Supabase Edge Functions + Resend for email delivery, with a queue-based architecture for reliability.

## Architecture
```
Admin publishes scholarship
    → Database trigger / Edge Function
    → process-new-listing (find matching users, create matches + queue)
    → send-notifications (queue worker, calls Resend)
    → User receives email
```

## Tables
1. `notification_preferences` — user opt-in/frequency/score threshold
2. `user_matches` — computed match records (scholarship × user)
3. `notification_queue` — pending emails with retry tracking
4. `email_events` — delivery analytics (sent/opened/clicked/bounced)

## Edge Functions
1. `process-new-listing` — triggered on scholarship publish, finds matches, queues emails
2. `send-notifications` — queue worker, sends pending emails via Resend
3. `send-daily-digest` — groups daily matches into one email per user

## Cron
- `send-notifications`: every 5 minutes
- `send-daily-digest`: daily at 07:00 UTC

## Dependencies
- Resend API key (env: `RESEND_API_KEY`)
- Existing `profiles` and `scholarships` tables
- Existing matching engine (`computeScholarshipMatch`)
