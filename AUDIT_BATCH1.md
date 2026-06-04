# Zawadi Complete Audit — Batch 1 (A+B)
Date: 2026-06-04
Tests: 44 | Pass: 25 | Fail: 8 | Partial: 11

| ID | Description | Status | Finding | Evidence |
|----|-------------|--------|---------|----------|
| A1 | Page load time | PASS | 414ms |  |
| A2 | iPhone SE 375x812 | PASS | W:375 H:812 Headline:"A scholarship portal for African applicants" CTAs:[Create account] H-scroll:false |  |
| A3 | iPhone 14 390x844 | PASS | W:390 H:844 Headline:"A scholarship portal for African applicants" H-scroll:false |  |
| A4 | iPad 768x1024 portrait | PASS | W:768 H:1024 H-scroll:false |  |
| A5 | Desktop 1280x800 | PASS | W:1280 H:800 H-scroll:false |  |
| A6 | Mobile landscape 844x390 | PASS | W:844 H:390 H-scroll:false |  |
| A7 | Logo navigation | FAIL | No logo link found |  |
| A8 | Create Your Profile button | FAIL | Button not found |  |
| A9 | See How It Works | FAIL | Button not found |  |
| A10 | Log In in navbar | FAIL | Login link not found |  |
| A11a | Lorem ipsum check | PASS | No Lorem ipsum |  |
| A11b | Raw icon text check | PASS | No raw icon text |  |
| A11c | Fake demo numbers | PASS | No fake demo numbers |  |
| A12 | Footer links | PARTIAL | 0 footer links found |  |
| A13 | Footer height | PARTIAL | Footer not found |  |
| A14 | Browser tab title | PASS | Zawadi Scholarship Manager |  |
| A15-sk_live | Secret: sk_live | PASS | sk_live not found |  |
| A15-SUPABASE_SERVICE_ROLE | Secret: SUPABASE_SERVICE_ROLE | PASS | SUPABASE_SERVICE_ROLE not found |  |
| A15-GOOGLE_API_KEY | Secret: GOOGLE_API_KEY | PASS | GOOGLE_API_KEY not found |  |
| A15-DEEPSEEK_API_KEY | Secret: DEEPSEEK_API_KEY | PASS | DEEPSEEK_API_KEY not found |  |
| A15-pk_live | Secret: pk_live | PASS | pk_live not found |  |
| A16 | /about loads | PASS | Zawadi
Scholarship Portal
A scholarship portal for African applicants

Match wit |  |
| A17 | /faq loads | PASS | Zawadi
Scholarship Portal
A scholarship portal for African applicants

Match wit |  |
| A18 | /how-it-works loads | PASS | Zawadi
Scholarship Portal
A scholarship portal for African applicants

Match wit |  |
| A19 | /privacy loads | PASS | Zawadi
Scholarship Portal
A scholarship portal for African applicants

Match wit |  |
| A20 | /terms loads | PASS | Zawadi
Scholarship Portal
A scholarship portal for African applicants

Match wit |  |
| A21 | /contact loads with form | PASS | Contact form found |  |
| A22 | Empty name validation | PARTIAL | No visible validation message |  |
| A24 | /dashboard redirects when logged out | FAIL | Redirected to: http://localhost:5173/dashboard |  |
| A25 | /admin redirects when logged out | FAIL | Redirected to: http://localhost:5173/admin |  |
| A26 | 404 page renders | PASS | Content: Zawadi
Scholarship Portal
Overview
Scholarships
Documents
Pricing
Intake
Portal ... |  |
| B1 | Registration flow | PASS | Auto-logged in, redirected |  |
| B4 | Session exists after registration | PARTIAL | Session email: supabase not on window |  |
| B5 | Manual login after registration | PASS | Login succeeded |  |
| B6 | Duplicate email registration | PARTIAL | Message: "(no error)" |  |
| B7a | Empty name validation | PARTIAL | No validation message |  |
| B8 | Wrong password login | PARTIAL | Error: "(no error)" |  |
| B9 | Non-existent email login | PARTIAL | Error: "(no error)" |  |
| B10 | Rate limit after 6 attempts | PARTIAL | Message after 6 attempts: "(no visible error after 6 attempts)" |  |
| B11 | Session persistence | PARTIAL | Cannot read properties of undefined (reading 'auth') |  |
| B12a | Logout redirects | PASS | URL after logout: http://localhost:5173/ |  |
| B12b | Session cleared after logout | FAIL | Cannot read properties of undefined (reading 'auth') |  |
| B14 | Admin login page accessible | PARTIAL | URL: http://localhost:5173/admin/login, Form found: false |  |
| B15 | Admin access blocked when logged out | FAIL | URL: http://localhost:5173/admin |  |
