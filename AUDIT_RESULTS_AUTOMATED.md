# Zawadi Pre-Launch Audit — Playwright Automated Results

**Date:** 2026-06-04
**Total Tests Attempted:** 38
**Passed:** 22
**Failed:** 8
**Partial:** 8

## Results

| ID | Description | Status | Finding | Evidence |
|----|-------------|--------|---------|----------|
| A1 | Load time | PASS | 7.11s | Page loaded in 7.11s |
| A6 | Logo navigates to / | PASS | Navigates to / | Current URL: https://www.techsari.online/ |
| A10-1 | Lorem ipsum check | PASS | No Lorem ipsum |  |
| A10-2 | Raw icon text | PASS | No raw icon text visible |  |
| A13 | Browser tab title | PASS | Scholarships for African Students — Zawadi |  |
| A15-sk_live | Secret: sk_live | PASS | sk_live not found |  |
| A15-SUPABASE_SERVICE_ROLE | Secret: SUPABASE_SERVICE_ROLE | PASS | SUPABASE_SERVICE_ROLE not found |  |
| A15-GOOGLE_API_KEY | Secret: GOOGLE_API_KEY | PASS | GOOGLE_API_KEY not found |  |
| A15-DEEPSEEK_API_KEY | Secret: DEEPSEEK_API_KEY | PASS | DEEPSEEK_API_KEY not found |  |
| A15-pk_live | Secret: pk_live | PASS | pk_live not found |  |
| A27 | 404 page | PASS | HTTP 404, title: "404: NOT_FOUND" |  |
| A25 | Dashboard redirect when logged out | FAIL | Redirected to: https://www.techsari.online/dashboard |  |
| A26 | Admin redirect when logged out | FAIL | Redirected to: https://www.techsari.online/admin |  |
| A28 | Scholarships logged out | PARTIAL | Redirected to: https://www.techsari.online/scholarships |  |
| A16 | About page loads | FAIL | HTTP 404, content: "404: NOT_FOUND
Code: NOT_FOUND
ID: cpt1::594fr-1780552935449-69f5572a87e6

Read ..." |  |
| A17 | FAQ page loads | FAIL | HTTP 404, content: "404: NOT_FOUND
Code: NOT_FOUND
ID: cpt1::j9ssq-1780552935558-314e8e71b757

Read ..." |  |
| A19 | How it works page loads | FAIL | HTTP 404, content: "404: NOT_FOUND
Code: NOT_FOUND
ID: cpt1::j9ssq-1780552935653-6f463570a141

Read ..." |  |
| A20 | Privacy page loads | FAIL | HTTP 404, content: "404: NOT_FOUND
Code: NOT_FOUND
ID: cpt1::j9ssq-1780552935748-44c81d33b184

Read ..." |  |
| A21 | Terms page loads | FAIL | HTTP 404, content: "404: NOT_FOUND
Code: NOT_FOUND
ID: cpt1::594fr-1780552935844-7d75d791ec7a

Read ..." |  |
| A11 | Footer links | PARTIAL | No footer links found (SPA may not have footer in DOM) |  |
| B4-1 | Invalid email validation | PARTIAL | Error shown: "(no visible error element)" |  |
| B5 | Login success | PASS | Redirected to: https://www.techsari.online/ | Status: 400 |
| B6 | Wrong password error | PARTIAL | Error: "warningIncorrect email or password" |  |
| B7 | Non-existent email error same as wrong password | PARTIAL | Error: "warningIncorrect email or password" | Check if same as B6 error |
| B8 | Rate limit after 6 failed attempts | PASS | After 6 attempts: "warningIncorrect email or password" |  |
| B12 | Admin login page | PASS | URL: https://www.techsari.online/admin/login |  |
| C22 | Algorithmic language check | PASS | No algorithmic language found |  |
| N1 | Number of sections | PASS | 6 sections found |  |
| N3 | Headline text | PASS | Unlock Your Academic Future with Techsari Zawadi |  |
| N4 | Subheading text | PASS | The System Isn't Built for Us.We Understand Your Journey. |  |
| N7 | Problem vs Solution verbose layout absent | PASS | No Problem/Solution layout |  |
| N8 | Hardcoded fake statistics | PASS | No fake stats found |  |
| K4 | HTTPS redirect | PASS | Confirmed curl test: HTTP→HTTPS redirects |  |
| K2 | RLS cross-user test | PARTIAL | Supabase not accessible: supabase not available on window |  |
| K5 | Network auth header check | PARTIAL | 0 supabase XHR requests observed | Check audit.har for Authorization header values |
| K6 | JWT expiry check | PARTIAL | supabase not available |  |
| H1 | Subscription plans visible | FAIL | Plans not found at /plans |  |
| H1b | No $29 Mentor Review individual plan | PASS | No $29 Mentor plan |  |

## Notes
- Tests requiring manual interaction (form fills beyond basic, file uploads, Paystack payments, mentor pipeline) could not be fully automated.
- See LAUNCH_AUDIT_CHECKLIST.md for the complete manual test list.
- HAR file saved to audit.har for network request analysis.
