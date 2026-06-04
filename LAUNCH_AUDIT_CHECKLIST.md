# Zawadi Pre-Launch Audit — Manual Test Checklist

**Date:** 2026-06-04
**Instructions:** Open Chrome DevTools → Network tab (preserve log). Execute each test in order. Record Pass/Fail/Partial with exact evidence (screenshots, HTTP status codes, response bodies). Save completed report as `ZAWADI_AUDIT_REPORT_2026.md`.

---

## Setup: Create Test Accounts (record exact credentials)

| Role | Email | Password | Plan | Notes |
|------|-------|----------|------|-------|
| Explorer | `explorer_test@zawadi-audit.com` | `AuditTest2026!` | Explorer | Register fresh |
| Scholar Plus | `plus_test@zawadi-audit.com` | `AuditTest2026!` | Plus | Register then upgrade |
| Pro | `pro_test@zawadi-audit.com` | `AuditTest2026!` | Pro | Register then upgrade |
| Mentor | `mentor_test@zawadi-audit.com` | `AuditTest2026!` | Explorer | Register, then admin assigns mentor role |
| Admin | `admin@zawadi.app` | (use existing admin password) | — | Super Admin |

## Setup: Prepare Test Files

- [ ] Real PDF transcript from any university
- [ ] Real PDF CV with work experience
- [ ] JPG image of any certificate
- [ ] PNG image of any document
- [ ] Dummy file over 20MB (for rejection testing)
- [ ] Any video file (for file type rejection testing)

---

## SECTION A: PUBLIC WEBSITE & LANDING PAGE

### A1: Load Time
- [ ] Navigate to https://techsari.online
- [ ] In Network tab, note the `Finish` time at the bottom bar
- [ ] Record: `_____ seconds`

### A2: Mobile 375px (iPhone SE)
- [ ] Open DevTools → Toggle Device Toolbar → iPhone SE (375×667)
- [ ] Record: Is all text readable? Yes / No
- [ ] Record: Is there horizontal scrolling? Yes / No
- [ ] Screenshot and attach

### A3: Tablet 768px (iPad)
- [ ] Set device to iPad (768×1024)
- [ ] Record layout description (e.g., "side-by-side cards", "stacked layout")

### A4: Desktop 1280px
- [ ] Set to responsive 1280×800
- [ ] Record layout description

### A5: Mobile Landscape (844×390)
- [ ] Rotate iPhone simulation to landscape
- [ ] Record: Does the layout reflow or break?

### A6: Logo Click
- [ ] Click the Zawadi logo in the navbar
- [ ] Record: Navigates to `_____`

### A7: Create Your Profile
- [ ] Click "Create Your Profile" button
- [ ] Record: What happens (modal? redirect to /register? scroll?)

### A8: See How It Works
- [ ] Click "See How It Works"
- [ ] Record: Smooth scroll or jump?

### A9: Log In
- [ ] Click "Log In" in navbar
- [ ] Record: What appears? (modal? /login page?)

### A10: Scroll Full Page
- [ ] Scroll from top to bottom
- [ ] List every section visible: `_____`
- [ ] Record any raw icon text visible (e.g., `cloud_upload`, `check_circle`): `_____`
- [ ] Record any Lorem ipsum or placeholder text: `_____`
- [ ] Record any hardcoded fake numbers: `_____`

### A11: Footer Links
- [ ] Click every link in the footer
- [ ] Record each destination URL and whether it loads: `_____`

### A12: Footer Height
- [ ] Inspect footer element in DevTools
- [ ] Record pixel height: `_____px`
- [ ] Record: Is there excessive whitespace? Yes / No

### A13: Browser Tab Title
- [ ] Record exact tab title: `_____`

### A14: Open Graph Tags
- [ ] Use Facebook Sharing Debugger (https://developers.facebook.com/tools/debug/) or view page source
- [ ] Record og:title: `_____`
- [ ] Record og:description: `_____`

### A15: View Page Source — Secrets Check
- [ ] Right-click → View Page Source. Ctrl+F search for each:
- [ ] `sk_live`: Found / Not Found
- [ ] `SUPABASE_SERVICE_ROLE`: Found / Not Found
- [ ] `GOOGLE_API_KEY`: Found / Not Found
- [ ] `DEEPSEEK_API_KEY`: Found / Not Found
- [ ] `pk_live`: Found / Not Found

### A16: /about
- [ ] Navigate to /about
- [ ] Record: Page loads? Yes / No. Content visible: `_____`

### A17: /faq — Search
- [ ] Navigate to /faq
- [ ] Type "scholarship" in the search bar
- [ ] Record: How many results appear? `_____`. Are they relevant? Yes / No

### A18: FAQ Accordion
- [ ] Click 3 FAQ accordion items
- [ ] Record: Do they open/close smoothly? Yes / No

### A19: /how-it-works
- [ ] Navigate to /how-it-works
- [ ] Record the four steps shown: `_____`

### A20: /privacy
- [ ] Navigate to /privacy
- [ ] Record: Page loads completely? Yes / No

### A21: /terms
- [ ] Navigate to /terms
- [ ] Record: Page loads completely? Yes / No

### A22: /contact — Submit
- [ ] Navigate to /contact
- [ ] Fill all fields with test data
- [ ] Submit the form
- [ ] Record exact response: `_____`
- [ ] Check Supabase `contact_submissions` table — record exists? Yes / No

### A23: Contact — Empty Name
- [ ] Submit with empty name field
- [ ] Record validation message: `_____`

### A24: Contact — Invalid Email
- [ ] Submit with email `notanemail`
- [ ] Record validation message: `_____`

### A25: /dashboard While Logged Out
- [ ] Log out, navigate to /dashboard
- [ ] Record redirect behavior: `_____`

### A26: /admin While Logged Out
- [ ] Navigate to /admin
- [ ] Record redirect behavior: `_____`

### A27: 404 Page
- [ ] Navigate to /nonexistentpage
- [ ] Record: Does a styled 404 page render? Yes / No
- [ ] Record what it shows: `_____`

### A28: /scholarships While Logged Out
- [ ] Navigate to /scholarships while logged out
- [ ] Record what happens: `_____`

---

## SECTION B: AUTHENTICATION SYSTEM

### B1: Registration — Full Flow
- [ ] Click "Create Your Profile"
- [ ] Fill: Name = `Audit Test User`, Email = `explorer_test@zawadi-audit.com`, Country = `Ethiopia`, Password = `AuditTest2026!`
- [ ] Click "Create Account"
- [ ] Network tab: Record exact URL called: `_____`
- [ ] Record HTTP status code: `_____`
- [ ] Record response body: `_____`
- [ ] Record redirect destination: `_____`

### B2: Check Supabase After Registration
- [ ] Open Supabase Dashboard → Authentication → Users
- [ ] Confirm user appears
- [ ] Check `profiles` table
- [ ] Record: plan = `explorer`? Yes / No
- [ ] Record: role = `user`? Yes / No
- [ ] Record: country = `Ethiopia` (not Kenya)? Yes / No

### B3: Duplicate Registration
- [ ] Try registering again with `explorer_test@zawadi-audit.com`
- [ ] Record exact error: `_____`
- [ ] Confirm it reads "An account with this email already exists" (not raw Supabase error)

### B4: Validation Tests
- [ ] Register with empty name — validation message: `_____`
- [ ] Register with invalid email — validation message: `_____`
- [ ] Register with 5-char password (`Abc12`) — validation message: `_____`

### B5: Login — Correct Credentials
- [ ] Log out if logged in
- [ ] Enter `explorer_test@zawadi-audit.com` / `AuditTest2026!`
- [ ] Click Login
- [ ] Record redirect destination: `_____`
- [ ] Record: Session token exists? Yes / No (check Application → Local Storage)

### B6: Login — Wrong Password
- [ ] Enter correct email, password `WrongPass123`
- [ ] Record exact error message: `_____`

### B7: Login — Non-Existent Email
- [ ] Enter `doesnotexist@nowhere.com` with any password
- [ ] Record exact error message: `_____`
- [ ] Confirm it's SAME message as B6 (doesn't reveal if email exists)

### B8: Rate Limit
- [ ] Make 6 rapid failed login attempts with wrong password
- [ ] Record what happens on 6th attempt: `_____`

### B9: Session Persistence
- [ ] Log in successfully
- [ ] Close the browser tab completely
- [ ] Open new tab to techsari.online
- [ ] Record: Still logged in? Yes / No

### B10: Logout
- [ ] Click Logout
- [ ] Record redirect: `_____`
- [ ] Open browser history, navigate back to previous authenticated page
- [ ] Record: Session restored or redirected to login? `_____`

### B11: Password Reset
- [ ] Click "Forgot Password"
- [ ] Enter `explorer_test@zawadi-audit.com`
- [ ] Submit
- [ ] Record success message: `_____`
- [ ] Check email inbox — reset email arrived? Yes / No
- [ ] Click the link, enter new password
- [ ] Confirm reset succeeds
- [ ] Log in with new password — success? Yes / No

### B12: Admin Login Security
- [ ] Navigate to /admin/login
- [ ] Log in with admin credentials
- [ ] Record: Admin portal loads? Yes / No
- [ ] Open new tab, try calling an Edge Function with student JWT in Authorization header
- [ ] Record HTTP status: should be 403. Actual: `_____`

---

## SECTION C: PROFILE SETUP

### C1: Wizard Auto-Trigger
- [ ] Register a BRAND NEW account with unique email
- [ ] Record: Does profile wizard appear automatically? Yes / No

### C2: Non-Kenyan Nationality
- [ ] In wizard: DOB = any valid date, Nationality = Nigeria, Degree = Masters, Field = Computer Science, GPA = 3.7/4.0
- [ ] Click Save
- [ ] Check Supabase profiles — confirm country = Nigeria (not Kenya): Yes / No

### C3: Wizard Persistence After Logout
- [ ] Log out, log back in
- [ ] Record: Does wizard appear again? Yes / No. **If yes, this is a bug.**

### C4: Wizard Trigger Condition
- [ ] If wizard does NOT reappear, find the code condition in `App.tsx` that controls it
- [ ] Record the condition: `_____`

### C5-C20: Full Profile Steps
For each step, fill every field, save, refresh page, confirm persistence:

- [ ] **Step 1 (Identity):** Change country to Ghana. Save. Refresh. Persists? Yes / No
- [ ] **Step 2 (Academic):** Change GPA system to Nigerian 5.0. Enter GPA 4.2. Save. Check Supabase. Persists? Yes / No
- [ ] **Step 3 (Destination):** Select "West Africa hubs". Tooltip appears? Yes / No. Also select "Nordic countries". Save. Check `destination_regions` in Supabase has both values. Yes / No
- [ ] **C3 Check:** Does ANY dropdown option contain the word "Other"? Yes / No. If yes, record which: `_____`
- [ ] **Step 4 (Language):** Select IELTS, score 7.0. Save. Select French CEFR B2. Save. All persist? Yes / No
- [ ] **Step 5 (Background):** Work experience = 3. Financial need = "need scholarship funding". Gender = Female. No parenthetical algorithmic text visible? Yes / No. Save.

### C21: GPA Change Affects Matches
- [ ] Change GPA from 3.7 to 3.9
- [ ] Navigate to Scholarships
- [ ] Record: Did match scores change? Yes / No

### C22: No Algorithmic Language
- [ ] Search profile UI for: `calibrate`, `indices`, `weighting`, `matrix`, `equity support eligible`, `secondary partial grant assistance`, `Calibrate Profile Matching Matrix`
- [ ] Record: Any found? Yes / No. If yes, where: `_____`

---

## SECTION D: SCHOLARSHIP MATCHING

### D1: Initial Matches for Nigeria Student
- [ ] Set profile: Nigeria, Masters, CS, GPA 3.7
- [ ] Open Scholarships page
- [ ] Record total count: `_____`
- [ ] Record top 5: name + match score: `_____`
- [ ] Record: Any scholarship shown that does NOT list Nigeria? Yes / No

### D2: Filter Tests
- [ ] Country = Nigeria — count: `_____. All list Nigeria? Yes / No`
- [ ] Degree = Masters — count: `_____. No undergrad-only appears? Yes / No`
- [ ] Field = Computer Science — count: `_____`
- [ ] Funding = Full — count: `_____`
- [ ] No IELTS — count: `_____. All have no_ielts=true? Yes / No`
- [ ] Closing Soon — count: `_____. All deadlines within 30 days? Yes / No`
- [ ] Host Region = West Africa hubs — count: `_____`
- [ ] Multi-filter (Nigeria + Masters + Full) — count: `_____. All conditions satisfied? Yes / No`
- [ ] Clear all filters — total returns to full list? Yes / No

### D3: Scholarship Detail Overlay
- [ ] Click Rhodes Scholarship card
- [ ] Record: work_experience_required shown if not null? Yes / No
- [ ] Record: age_limit_masters shown if not null? Yes / No
- [ ] Record: Apply Now URL correct? Yes / No
- [ ] Record: host_institution = "University of Oxford"? Yes / No

### D4: Match Rationale
- [ ] Click "Get AI Explanation" on any scholarship
- [ ] Record time from click to response: `_____ seconds`
- [ ] Record four sections: Summary? Strengths? Weaknesses? Suggestions? All present? Yes / No
- [ ] Record: Rationale mentions Nigeria (or actual country, not generic)? Yes / No

### D5: Recommendation Feedback
- [ ] Click thumbs up on Chevening
- [ ] Check `recommendation_feedback` in Supabase — record exists with `feedback='relevant'`? Yes / No
- [ ] Click thumbs up again on same scholarship — duplicate created? Yes / No
- [ ] Click thumbs down on DAAD — record created with `feedback='irrelevant'`? Yes / No

### D6: Application Journey
- [ ] Save 3 scholarships at different stages
- [ ] Open Dashboard
- [ ] Record: Journey counts match actual applications? Yes / No

---

## SECTION E: APPLICATION TRACKER

- [ ] E1: Save a scholarship. Appears in /applications? Yes / No
- [ ] E2: Record all 9 status dropdown options: `_____`
- [ ] E3: Change status to Interview. Saves without reload? Yes / No
- [ ] E4: Add a note. Saves without reload? Yes / No
- [ ] E5: Change priority to High. Saves? Yes / No
- [ ] E6: Click delete. Confirmation dialog shows scholarship name? Yes / No
- [ ] E7: Confirm deletion. Row gone from Supabase? Yes / No
- [ ] E8: Cancel deletion. Application remains? Yes / No
- [ ] E9: Filter by "Applied". Only Applied appear? Yes / No
- [ ] E10: Sort by deadline. Order changes? Yes / No
- [ ] E11: Delete all. Empty state message appears? Yes / No. Text: `_____`
- [ ] E12: As Explorer, try 6th application. Error/block message: `_____`
- [ ] E13: As Plus, create 10 applications. All succeed? Yes / No
- [ ] E14: Dashboard KPI cards show real numbers? Yes / No
- [ ] E15: New user with 0 applications shows 0? Yes / No
- [ ] E16: Click Applications KPI card. Navigates to /applications? Yes / No
- [ ] E17: RLS test — query applications with different email. Returns 0? Yes / No
- [ ] E18: "Configure Tracker" button navigates to /applications? Yes / No

---

## SECTION F: DOCUMENT VAULT

- [ ] F1: Upload PDF transcript. Record storage path: `_____. Analysis status immediately: `_____. After 30s: `_____`
- [ ] F2: AI Insights — extracted institution: `_____. Degree: `_____. GPA: `_____. Graduation year: `_____. Manual verification — exact match / close / incorrect?
- [ ] F3: Check profiles table — `doc_gpa_normalised_extracted`: `_____. User's gpa field unchanged? Yes / No`
- [ ] F4: Upload PDF CV. Extracted work_experience_years: `_____. Primary field: `_____. First 5 skills: `_____`
- [ ] F5: Upload JPG certificate. Accepted and analyzed? Yes / No
- [ ] F6: Upload PNG document. Accepted? Yes / No
- [ ] F7: Upload 20MB file. Error message: `_____`
- [ ] F8: Upload video file. Error message: `_____`
- [ ] F9: As Explorer, upload 5 docs. All succeed? Yes / No
- [ ] F10: As Explorer, 6th upload. Block message: `_____`
- [ ] F11: Upgrade to Plus. Upload docs 6-15. All succeed? Yes / No
- [ ] F12: Check Supabase — 15 records for this user? Yes / No
- [ ] F13: Explorer badge text + color: `_____`
- [ ] F14: Plus badge text + color: `_____`
- [ ] F15: Pro badge text + color: `_____`
- [ ] F16: Pro AI Insights shows full content (not just metadata)? Yes / No
- [ ] F17: Click "Confirm or Correct". Modal opens? Yes / No
- [ ] F18: Change GPA to 3.8. Save. Check `user_confirmed` flag set? Yes / No
- [ ] F19: Scholarships page. Match scores use 3.8? Yes / No
- [ ] F20: Update profile GPA to 4.0. Matching uses 4.0 (profile priority)? Yes / No
- [ ] F21: Delete doc. File removed from storage? Yes / No
- [ ] F22: Row deleted from documents table? Yes / No
- [ ] F23: Storage counter decrements? Yes / No
- [ ] F24: No "Simulation Mode" text in vault? Yes / No
- [ ] F25: Check Edge Function logs — model = `deepseek-v4-pro`? Yes / No

---

## SECTION G: ESSAY STUDIO

- [ ] G1: Open AI Essay Studio. What appears? (Chat interface with 2 panels? Or form with generate button?)
- [ ] G2: First AI message: `_____`
- [ ] G3: Answer all 5 questions (use real Chevening answers). Draft appears? Yes / No
- [ ] G4: Search draft for "Kenya" — appears? Yes / No. Actual country mentioned: `_____`
- [ ] G5: Draft mentions Masters, CS, correct GPA? Yes / No
- [ ] G6: Send "opening too generic, start with Lagos payment story". Updates? Yes / No. AI explains changes? Yes / No
- [ ] G7: "Add 90 million unbanked citizens". Updated? Yes / No
- [ ] G8: "Sounds like AI, make it sound like me". Tone changes? Yes / No
- [ ] G9: Direct edit in workspace. New version labeled "Student Edit"? Yes / No
- [ ] G10: Make 5 chat + 2 direct edits. Timeline count: `_____. Click 3rd version — reverts? Yes / No`
- [ ] G11: Request Critique. Has identifiable sections? Yes / No. References specific draft content? Yes / No
- [ ] G12: Revise, request Polish. Meaningfully different? Yes / No
- [ ] G13: Warning after Polish. Text: `_____. Mentions AI detection risk? Yes / No`
- [ ] G14: Click "Use My Documents". Panel opens? Yes / No
- [ ] G15: Select transcript. AI acknowledgment: `_____`
- [ ] G16: New draft with transcript. Mentions institution + GPA from transcript? Yes / No
- [ ] G17: Explorer — generate 3 essays. All succeed? Yes / No. 3rd time: `_____s`
- [ ] G18: Explorer — 4th essay. Block message: `_____. Includes upgrade prompt? Yes / No`
- [ ] G19: Explorer — try Critique. Message: `_____`
- [ ] G20: Plus — generate 10. 10th succeeds? Yes / No. 11th block: `_____`
- [ ] G21: Pro — generate 30. All succeed, no rate limiting? Yes / No
- [ ] G22: Pro — Voice Profile after 3 essays. Style description: `_____. essays_analyzed count from Supabase: `_____`
- [ ] G23: Mentor handoff message: `_____. Click Request. Reference: `_____. Check mentor_review_requests — status, response_deadline, priority, user_first_name: `_____`
- [ ] **G24: Verdict** — Conversation feels genuine or form-like? `_____. AI remembered context from Q2 in G7? Yes / No. Useful for Chevening applicant? Yes / No. **Overall: Ready / Needs Improvement / Not Ready**
- [ ] G25: Edge Function logs — model: `deepseek-v4-pro`? Yes / No

---

## SECTION H: SUBSCRIPTIONS & PAYMENTS

- [ ] H1: Three plan names: `_____, _____, _____.` No $29 Mentor Review plan? Yes / No
- [ ] H2: Explorer features: `_____`
- [ ] H3: Plus features: `_____`
- [ ] H4: Pro features: `_____`
- [ ] H5: Institutional card has "Contact Us" (no Subscribe)? Yes / No
- [ ] H6: Annual toggle — prices: `_____`
- [ ] H7: Current plan highlighted? Yes / No
- [ ] H8: Mission statement text: `_____`
- [ ] H9: Subscribe to Plus — Paystack Pop iframe appears or simulation? `_____`
- [ ] H10: Bank Transfer tab absent? Yes / No
- [ ] H11: Complete payment. Profiles.plan = `plus`? Yes / No
- [ ] H12: Header shows "Scholar Plus" immediately (no refresh)? Yes / No
- [ ] H13: Upload 6th doc (now Plus). Succeeds? Yes / No
- [ ] H14: Payments table record values: `_____`
- [ ] H15: Audit_logs plan change entry exists? Yes / No
- [ ] H16: Try subscribe to Explorer while on Plus. HTTP status: `_____. Response: `_____`
- [ ] H17: Profiles.plan still `plus`? Yes / No
- [ ] H18: Try subscribe to Plus while already Plus. Response: `_____`
- [ ] H19: Payment request with another user's email. Whose plan updates? `_____`
- [ ] H20: Payment request with no auth token. HTTP status: `_____`
- [ ] H21: Set plan to `super_plan`. Error response: `_____`

---

## SECTION I: MENTOR REVIEW PIPELINE

- [ ] I1: Explorer submits review. Request reference: `_____`
- [ ] I2: Check Supabase — status, priority, response_deadline, user_first_name, user_country. user_email stored but not shown to mentor? Yes / No
- [ ] I3: Explorer — 2nd review in same month. Block message: `_____`
- [ ] I4: Plus — submit 3 reviews. All 3 succeed? Yes / No. References: `_____`
- [ ] I5: Plus — 4th review. Block message: `_____`
- [ ] I6: Pro — submit 8 reviews. All succeed? Yes / No. 9th block: `_____`
- [ ] I7: Explorer deadline = 7 days? Yes / No. Exact timestamp: `_____`
- [ ] I8: Plus deadline = 5 days? Yes / No. Exact: `_____`
- [ ] I9: Pro deadline = 2 days? Yes / No. Exact: `_____`
- [ ] I10: Explorer priority = `standard`, Plus = `medium`, Pro = `high`? Yes / No
- [ ] I11: Admin — Mentor Queue. Pending count: `_____`
- [ ] I12: Pro request above Explorer? Yes / No
- [ ] I13: Click pending. Student email NOT shown? Yes / No. Visible info: `_____`
- [ ] I14: Click Assign. Mentor list shows queue count + specializations? Yes / No
- [ ] I15: Assign Pro to mentor. Status changes in Supabase? Yes / No
- [ ] I16: Notifications table — mentor notified? Yes / No
- [ ] I17: Assign Explorer to same mentor. Appears in In Progress? Yes / No
- [ ] I18: Assigning beyond max_concurrent_reviews blocked? Yes / No. Response: `_____`
- [ ] I19: Login as mentor. Page = /mentor (not /dashboard)? Yes / No
- [ ] I20: Student email NOT visible? Yes / No. Visible info: `_____`
- [ ] I21: Click Begin Review. Three panel layout? Yes / No
- [ ] I22: Fill feedback, highlight paragraph, create revised version. All work? Yes / No
- [ ] I23: Submit for Admin Review. Confirmation message: `_____`
- [ ] I24: Supabase — status + mentor_submitted_at values: `_____`
- [ ] I25: Mentor tries /admin — blocked? Yes / No
- [ ] I26: Mentor tries another's request — RLS blocks? Yes / No
- [ ] I27: Admin — Needs Approval tab. Submitted review appears? Yes / No
- [ ] I28: mentor_private_notes visible to admin? Yes / No
- [ ] I29: Approve. Status changes in Supabase? Yes / No
- [ ] I30: Student notification created? Yes / No
- [ ] I31: Rejection flow — Return with reason. Mentor sees reason? Yes / No. Revise + resubmit.
- [ ] I32: Revised feedback goes back to admin Needs Approval? Yes / No
- [ ] I33: Approve revised feedback. Success? Yes / No
- [ ] I34: Student logs in. Notification badge on essay studio nav? Yes / No
- [ ] I35: Open essay. Gold-bordered message? Yes / No. Mentor's first name shown? Yes / No
- [ ] I36: All feedback sections visible and expandable? Yes / No
- [ ] I37: Revised section shows side-by-side comparison? Yes / No
- [ ] I38: Click Accept Revision. Workspace updates? Yes / No
- [ ] I39: Rate mentor. Form fields: `_____. mentor_feedback_ratings record exists? Yes / No. mentor_profiles average_mentor_score updates? Yes / No
- [ ] I40: Student B tries to access Student A's review — RLS blocks? Yes / No

---

## SECTION J: ADMIN PORTAL

- [ ] J1: KPI cards — none show zero or placeholder? Yes / No. Values: `_____`
- [ ] J2: MRR = (Plus users × $5) + (Pro users × $12). Matches MRR shown? Yes / No
- [ ] J3: Platform Health — Database, AI, Storage, Pipeline statuses: `_____`
- [ ] J4: Last pipeline run timestamp: `_____`
- [ ] J5: Create scholarship. Appears immediately? Yes / No
- [ ] J6: Create without name. Validation error: `_____`
- [ ] J7: Invalid iso2 `ZZ`. Validation error: `_____`
- [ ] J8: Host_region dropdown — exactly 22 options? Yes / No. No "Other"? Yes / No. List: `_____`
- [ ] J9: Edit scholarship. Change persists, no duplicate? Yes / No
- [ ] J10: audit_logs — scholarship_created + scholarship_updated entries? Yes / No
- [ ] J11: Publish — appears on student page? Yes / No
- [ ] J12: Unpublish — disappears from student page? Yes / No
- [ ] J13: audit_logs — publish + unpublish entries? Yes / No
- [ ] J14: Preview as Student — renders correctly? Yes / No
- [ ] J15: Field completeness — empty deadline shows red dot? Yes / No
- [ ] J16: Bot Queue — total pending, confidence distribution, scam flags: `_____`
- [ ] J17: Sorted by confidence descending? Top 3: `_____`
- [ ] J18: Click pending — source URL clickable, opens new tab? Yes / No
- [ ] J19: Deadline has amber border? Yes / No. apply_url has amber border? Yes / No
- [ ] J20: Edit + Approve with Edits. Response: `_____`
- [ ] J21: Scholarship editor — all 21 fields mapped correctly (host_institution, fields_of_study, countries, amount, deadline, iso2)? Yes / No
- [ ] J22: Approved item has published=false? Yes / No. Publish manually — appears on student page? Yes / No
- [ ] J23: User list — passwords not visible? Yes / No
- [ ] J24: Change Explorer's plan to Plus from admin. Succeeds? Yes / No
- [ ] J25: No "admin_email column" error? Yes / No. Success/failure: `_____`
- [ ] J26: Assign mentor role to mentor_test. profiles.role = `mentor`? Yes / No
- [ ] J27: Suspend a user. DB status: `_____`
- [ ] J28: audit_logs — role change + plan change entries? Yes / No
- [ ] J29: Audit Trail — 10 most recent entries + action types: `_____`
- [ ] J30: admin_login entries from this session? Yes / No
- [ ] J31: failed_login entries from B8 rate limit test? Yes / No
- [ ] J32: Audit trail readable on 375px mobile? Yes / No

---

## SECTION K: SECURITY CHECKS

- [ ] K1: Dist folder — grep for `sk_live`, `SUPABASE_SERVICE_ROLE`, `GOOGLE_API_KEY`, `DEEPSEEK_API_KEY`. Any found? Yes / No
- [ ] K2: RLS cross-user — as Explorer, `supabase.from('applications').select('*')` in console. Returns only this user's rows? Yes / No. Count: `_____`
- [ ] K3: Student JWT calling admin Edge Function. HTTP status should be 403. Actual: `_____`
- [ ] K4: HTTP → HTTPS redirect works? Yes / No
- [ ] K5: Network tab → supabase.co requests. Authorization header uses anon key (not service_role key)? Yes / No
- [ ] K6: JWT expiry — `supabase.auth.getSession()`. Expires at: `_____. 7 days? Yes / No`
- [ ] K7: CORS — call Edge Function from different domain. Blocked? Yes / No

---

## SECTION L: PERFORMANCE

- [ ] L1: Lighthouse audit — Performance: `_____`. Accessibility: `_____`. Best Practices: `_____`. SEO: `_____`
- [ ] L2: Largest Contentful Paint: `_____s`
- [ ] L3: Total Blocking Time: `_____ms`
- [ ] L4: Cumulative Layout Shift: `_____`
- [ ] L5: Mobile Network tab — total page weight: `_____ KB/MB`
- [ ] L6: Raw Material Symbols visible? `cloud_upload`, `folder_open`, `check_circle`, `stars`, `schedule`, `trending_up`. Any found? Yes / No
- [ ] L7: 10 simultaneous registrations — how many succeed? `_____. All have profile rows? Yes / No`
- [ ] L8: Manual session expiry → navigate to /scholarships. Behavior: `_____`

---

## SECTION M: CROSS-BROWSER

For each browser, test: registration/login, scholarships, detail overlay, essay studio chat, document vault upload, plans page.

- [ ] M1: Chrome desktop — all pass? Yes / No. Issues: `_____`
- [ ] M2: Firefox desktop — all pass? Yes / No. Issues: `_____`
- [ ] M3: Safari desktop — all pass? Yes / No. Issues: `_____`
- [ ] M4: Chrome Android (DevTools simulation) — all pass? Yes / No
- [ ] M5: Safari iOS (DevTools simulation) — all pass? Yes / No
- [ ] M6: PWA install prompt on Chrome? Yes / No
- [ ] M7: PWA on iOS — Share → Add to Home Screen instructions show? Yes / No
- [ ] M8: Landscape mobile — layout issues? Yes / No. Describe: `_____`
- [ ] M9: Tablet 768px portrait — layout description: `_____`
- [ ] M10: Large desktop 1920px — layout description: `_____`

---

## SECTION N: HOMEPAGE REDESIGN

- [ ] N1: Number of sections on homepage: `_____`
- [ ] N2: Hero contains only: headline, subheading, 2 CTAs, 1 image? Yes / No
- [ ] N3: Headline text: `_____`
- [ ] N4: Subheading text: `_____`
- [ ] N5: Word count in above-fold area: `_____`
- [ ] N6: Any section with >3 sentences of body text? Yes / No. Which: `_____`
- [ ] N7: Problem vs Solution verbose card layout absent? Yes / No
- [ ] N8: No hardcoded "12 applications" or "5 documents"? Yes / No
- [ ] N9: Three feature cards — titles + one-sentence descriptions: `_____`
- [ ] N10: How It Works — four step titles: `_____`
- [ ] N11: Final CTA — headline + button text: `_____`
- [ ] N12: Overall impression — clean and minimal or cluttered and text-heavy? `_____`

---

## FINAL REPORT

After completing ALL tests, compile the results into `ZAWADI_AUDIT_REPORT_2026.md` with:

```markdown
# Zawadi Platform — Pre-Launch Audit Report
- Date: 2026-06-04
- Total Tests Executed:
- Total Passed:
- Total Failed:
- Total Partial:
- Critical Issues Found:
```

Include the Executive Summary, Section Results tables, Critical Issues, High Priority, Medium Priority, DeepSeek Summary, Payment Summary, Mentor Pipeline Summary, Performance Summary, and Final Launch Verdict.
