# Zawadi v2 — Frequently Asked Questions (Public-Facing)

**Published at:** `https://www.techsari.online/faq`

---

## About Zawadi

### What is Zawadi?
Zawadi is an AI-powered scholarship discovery and application management platform built specifically for African students. We help you find scholarships you're eligible for, track your applications, generate AI-assisted essays, and manage your documents — all in one place. "Zawadi" means "gift" in Swahili.

### Who built Zawadi?
Zawadi is built by Techsari, a technology company focused on building AI-powered tools for Africa.

### Which countries do you cover?
Zawadi covers all 54 African countries. Our scholarship database is filtered specifically for African student eligibility. Students from Kenya, Nigeria, Ghana, South Africa, Ethiopia, Tanzania, Uganda, Rwanda, Senegal, Egypt, and many other countries are already using Zawadi.

### How is Zawadi different from other scholarship websites?
Unlike generic aggregators, Zawadi is Africa-first. We verify every listing for African eligibility, provide AI essay generation, track applications through 8 stages, analyze your documents for gaps, and can even auto-fill application forms. No other platform combines all these tools in one place.

---

## Pricing & Plans

### Is Zawadi free?
Yes! Zawadi has a generous free tier (Explorer plan) that includes unlimited scholarship browsing, unlimited application tracking, 5 document uploads, and 3 AI-generated essays per day. You only upgrade when you need more.

### How much do paid plans cost?
- **Scholar Plus:** $5/month or $50/year — 10 essays/day, 15 documents, detailed match scores, document gap analysis
- **Application Pro:** $12/month or $120/year — 25 essays/day, 50 documents, auto-apply engine, essay voice learning
- **Mentor Review:** $29/month or $290/year — 50 essays/day, unlimited documents, 1-on-1 mentorship, human essay review, interview prep

All prices are shown in USD and Kenyan Shillings (KES). Payments are processed via Paystack in KES.

### What can I do on the free Explorer plan?
Explorer is designed to be genuinely useful, not a teaser. Free users can:
- Browse all published scholarships
- Track unlimited applications through 8 stages
- Upload up to 5 documents
- Generate 3 AI essays per day
- Get basic match scores and deadline urgency indicators
- Access all public resources (FAQ, guides)

### Why are some features locked?
Locked features are clearly marked with the plan required. Your free tools continue working normally even when premium features are visible. When you hit a limit (e.g., 4th essay of the day), you'll see an upgrade prompt — but your first 3 essays are always free.

### Can I cancel my subscription?
Yes, you can cancel anytime. Your access continues until the end of your current billing period. There are no cancellation fees. After cancellation, your account reverts to the free Explorer plan.

### Do you offer refunds?
Subscription fees are generally non-refundable, but if you experience technical issues preventing you from using paid features, contact us at hello@techsari.africa and we'll make it right.

---

## Scholarships

### How do you find scholarships?
Our AI-powered Zawadi Bot searches for scholarships daily across university websites, government portals, and foundation pages. Every scholarship is verified for African eligibility and must have a direct application link — no dead ends, no aggregator redirects.

### Can I trust the scholarship listings?
Yes. Every scholarship in our database is verified. We check: African eligibility, current deadlines, and direct application links. We reject listings from aggregator sites. Our dead link rate is under 2% and we run automated link checks daily.

### How often are scholarships added?
The Zawadi Bot runs daily at 9 AM East Africa Time, searching for new opportunities. New listings go through admin review before being published. You can expect fresh scholarships every week.

### What if a scholarship deadline has passed?
We mark expired scholarships and move them to an archive. If you spot an expired deadline that's still showing as active, please report it through the Contact page so we can update it.

### Why isn't a scholarship showing up even though I know it exists?
All new scholarships go through a verification process. If a scholarship was recently added by our bot, it may be in the admin review queue. If you know of a scholarship we're missing, please suggest it via the Contact page.

### What does "direct application link" mean?
It means the link takes you directly to the official scholarship application page — not to another aggregator, blog post, or listicle. You go straight to where you can read the requirements and apply.

---

## Application Tracking

### How does the application tracker work?
For each scholarship, you can track your progress through 8 stages:
1. **Not Started** — You've seen it but haven't acted
2. **Saved** — You're interested and want to come back
3. **Drafting** — You're working on the application
4. **Ready** — Application is complete, ready to submit
5. **Applied** — You've submitted!
6. **Interview** — You've been invited to interview
7. **Awarded** — You got the scholarship! 🎉
8. **Rejected** — Not this time (archive and learn)

You can set priority levels (High/Normal/Low), add notes, and see your overall progress on the stats dashboard.

### How many applications can I track?
Unlimited! Application tracking is free and unlimited on all plans — including Explorer. We believe every student should be able to manage their applications, regardless of budget.

---

## AI Essay Generator

### How does the AI essay generator work?
Our AI essay generator uses a 3-stage pipeline:
1. **Draft:** The AI creates a first draft based on your prompt and context
2. **Critique & Rewrite:** The AI reviews the draft for clarity, grammar, persuasiveness, and scholarship fit — then rewrites it better
3. **Final Polish:** The AI polishes the language, flow, and impact

You provide the prompt and details about the scholarship; the AI creates a personalized essay that you review and edit before using.

### What types of essays can it generate?
- Personal Statement
- Statement of Purpose (SOP)
- Motivation Letter
- Leadership Essay
- Study Plan / Research Proposal

### Are the essays good enough to submit?
AI-generated essays are powerful starting points, but you should always review, personalize, and verify the content before submitting. The AI captures structure and key points — your unique voice and experiences make the essay truly yours.

### Can scholarship providers tell it's AI-generated?
Modern AI-generated text can sometimes be detected. We recommend using our tools to create a strong draft, then personalizing it with your specific experiences, voice, and details. The best essays blend AI efficiency with human authenticity.

### Are my essay prompts private?
Yes. Your essay prompts and generated content are private to your account. We use the prompts transiently to generate your essays but do not use them to train AI models. See our Privacy Policy for details.

---

## Documents

### What documents can I upload?
You can upload: CV, Resume, Transcript, Certificate, Motivation Letter, Statement of Purpose, Reference Letters, Passport copy, Financial Evidence, Admission Letter, Essays, and Other application documents.

### What file formats do you accept?
PDF, DOCX, JPG, PNG, and TXT files. Maximum 10MB per file.

### Is there a limit on documents?
- Explorer (Free): 5 documents
- Scholar Plus: 15 documents
- Application Pro: 50 documents
- Mentor Review: Unlimited

### Where are my documents stored?
Documents are stored securely on Supabase Storage with encryption. Each user's documents are private and can only be accessed by that user (enforced by row-level security).

---

## Payments & Security

### How do I pay?
We use Paystack for payments. You can pay with debit/credit cards, mobile money (M-Pesa), or bank transfer — all in Kenyan Shillings (KES). Payment is secure and PCI-DSS compliant. We never see or store your card details.

### Is my data safe?
Yes. We take security seriously:
- Passwords are hashed (we cannot see them)
- All data encrypted at rest (AES-256) and in transit (TLS 1.2+)
- Row-level security ensures each user can only access their own data
- We never sell your data
- See our [Privacy Policy](/privacy) for full details

### How do I delete my account?
Contact us at privacy@techsari.online to request account deletion. Your data will be permanently deleted within 30 days. You can also delete individual documents and application data directly from the platform.

---

## Support

### How do I contact support?
- **General:** hello@techsari.africa or visit the [Contact page](/contact)
- **Privacy:** privacy@techsari.online
- **Legal:** legal@techsari.online
- **Security:** security@techsari.online

### What support do I get on each plan?
- **Explorer:** FAQ and community resources
- **Scholar Plus:** Email support (response within 48 hours)
- **Application Pro:** Priority email support (response within 24 hours)
- **Mentor Review:** Priority support (response within 12 hours) + WhatsApp access

### I found a bug. How do I report it?
Please email hello@techsari.africa with details: what happened, what you expected, and steps to reproduce. Screenshots are helpful!

---

## Technical

### Do I need to install anything?
No! Zawadi is a web app — just visit www.techsari.online in your browser. It works on desktop and mobile. You can also install it as a Progressive Web App (PWA) for offline access.

### What browsers do you support?
Chrome, Firefox, Safari, and Edge (latest versions). For the best experience, keep your browser updated.

### Does it work on slow internet?
Yes. Zawadi is designed for African internet conditions. The landing page loads in under 3 seconds on 3G. As a PWA, you can also access your saved data offline once loaded.

### Does Zawadi work on mobile?
Yes! Zawadi is fully responsive and works on phones, tablets, and desktops. You can also install it as a PWA for a native app-like experience with offline support.

---

*Last updated: May 27, 2026*
*More questions? Contact us at hello@techsari.africa*
