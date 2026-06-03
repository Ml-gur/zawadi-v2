# Zawadi v2 — Payment Plans & Monetization

**Document Version:** 3.0 (Rebuild)
**Date:** May 27, 2026
**Author:** Techsari Product Team
**Status:** Active — Spec-Driven Development

---

## 1. Pricing Philosophy

Zawadi uses a **freemium model** with four tiers. The free tier must be genuinely useful — not a crippled teaser. Scholarship browsing and application tracking are unlimited for everyone. Paid tiers unlock power features: more AI essays, more documents, auto-apply, and mentorship.

**Pricing anchor:** African student affordability. US/European SaaS pricing is irrelevant here. $5/month is the entry paid tier — low friction but meaningful revenue.

---

## 2. Pricing Tiers

### 2.1 Explorer (Free) — $0/month

**For:** Students discovering the platform, browsing opportunities, managing a few applications.

| Feature | Limit |
|---|---|
| Browse scholarships | Unlimited |
| Track applications | Unlimited (all 8 stages) |
| Match scores | Basic overview |
| AI essays | 3 per day |
| Document uploads | 5 total |
| Deadline urgency | ✅ |
| Document gap analysis | ❌ |
| Auto-apply | ❌ |
| Essay voice learning | ❌ |
| Support | Community/FAQ |

### 2.2 Scholar Plus — $5/month or $50/year

**For:** Active applicants who need more essays, more documents, and premium matching.

| Feature | Limit |
|---|---|
| Everything in Explorer | + |
| AI essays | 10 per day |
| Document uploads | 15 total |
| Match scores | Detailed breakdown |
| Document gap analysis | ✅ |
| Document intelligence (AI) | Basic |
| Priority in new listings | ✅ |
| Auto-apply | ❌ |
| Essay voice learning | ❌ |
| Support | Email (48h response) |

### 2.3 Application Pro — $12/month or $120/year

**For:** Power users managing 15+ applications simultaneously. Efficiency is everything.

| Feature | Limit |
|---|---|
| Everything in Plus | + |
| AI essays | 25 per day |
| Document uploads | 50 total |
| Auto-apply engine | ✅ |
| Essay voice learning | ✅ (from 3+ samples) |
| Document intelligence (AI) | Full analysis |
| Batch auto-apply | ✅ |
| Application strategy insights | ✅ |
| Support | Priority email (24h response) |

### 2.4 Mentor Review — $29/month or $290/year

**For:** Students who want expert human review and personalized strategy.

| Feature | Limit |
|---|---|
| Everything in Pro | + |
| AI essays | 50 per day |
| Document uploads | Unlimited |
| 1-on-1 mentorship | Monthly session |
| Essay review (human) | 2 essays/month |
| Interview preparation | ✅ |
| Custom application strategy | ✅ |
| Scholarship negotiation guidance | ✅ |
| Support | Priority (12h response) + WhatsApp |

---

## 3. Feature Comparison Matrix

| Feature | Explorer | Scholar Plus | App Pro | Mentor |
|---|---|---|---|---|
| **Monthly Price** | Free | $5 | $12 | $29 |
| **Annual Price** | Free | $50/yr | $120/yr | $290/yr |
| **Annual Savings** | — | 17% ($10) | 17% ($24) | 17% ($58) |
| Scholarship browsing | Unlimited | Unlimited | Unlimited | Unlimited |
| Application tracking | Unlimited | Unlimited | Unlimited | Unlimited |
| AI essays/day | 3 | 10 | 25 | 50 |
| Document uploads | 5 | 15 | 50 | Unlimited |
| Match score detail | Basic | Detailed | Detailed | Detailed |
| Deadline urgency | ✅ | ✅ | ✅ | ✅ |
| Document gap analysis | ❌ | ✅ | ✅ | ✅ |
| Document intelligence (AI) | ❌ | Basic | Full | Full |
| Auto-apply | ❌ | ❌ | ✅ | ✅ |
| Batch auto-apply | ❌ | ❌ | ✅ | ✅ |
| Essay voice learning | ❌ | ❌ | ✅ | ✅ |
| Strategy insights | ❌ | ❌ | ✅ | ✅ |
| Human essay review | ❌ | ❌ | ❌ | 2/month |
| 1-on-1 mentorship | ❌ | ❌ | ❌ | Monthly |
| Interview prep | ❌ | ❌ | ❌ | ✅ |
| Support | FAQ | Email (48h) | Priority (24h) | Priority + WhatsApp |

---

## 4. Paystack Integration

### 4.1 Plan Codes

| Plan | Paystack Plan Code |
|---|---|
| Plus Monthly | `PLN_unw5dchqqxx8h81` |
| Plus Annual | `PLN_7lbcd0qe0atza2a` |
| Pro Monthly | `PLN_02f9ve9p86cpx44` |
| Pro Annual | `PLN_r7qx092mwmn5bfz` |
| Mentor Monthly | `PLN_byk050d878lu61e` |
| Mentor Annual | `PLN_updqmdjw51xazfs` |

### 4.2 Checkout Flow

```
User clicks "Upgrade" → Plan selected → Paystack popup/inline
  ↓
Paystack processes payment (card, M-Pesa, bank transfer)
  ↓
Paystack sends webhook → Zawadi verifies signature → Updates user plan
  ↓
User sees "Plan Activated" confirmation
```

### 4.3 Payment Flow (Client-Side)

```js
async function initiatePayment(planCode, userEmail) {
  // 1. Initialize transaction via Paystack (client-side)
  const handler = PaystackPop.setup({
    key: VITE_PAYSTACK_PUBLIC_KEY,
    email: userEmail,
    amount: getPlanAmount(planCode), // in kobo
    currency: 'KES',
    plan: planCode, // triggers subscription
    callback: (response) => {
      // 2. Payment successful — webhook will handle plan update
      // Show "processing" state
      showToast('Payment received! Updating your plan...');
      // Poll /api/me until plan updates
      pollForPlanUpdate(planCode);
    },
    onClose: () => {
      // User closed popup without paying
      showToast('Payment cancelled');
    }
  });
  handler.openIframe();
}
```

### 4.4 Webhook Handling

Must handle these Paystack events:

| Event | Action |
|---|---|
| `charge.success` | Verify signature → Record payment → Update user plan |
| `subscription.create` | Record subscription → Link to user |
| `subscription.not_renew` | Downgrade user to free at period end |
| `subscription.disable` | Immediate downgrade to free |

```js
// Webhook handler (called from Supabase Edge Function or external endpoint)
async function handlePaystackWebhook(body, signature) {
  // 1. Verify HMAC SHA-512 signature
  if (!verifySignature(body, signature)) return { status: 401 };

  // 2. Check for duplicate (idempotency)
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('webhook_event_id', body.event)
    .maybeSingle();
  if (existing) return { status: 200, deduplicated: true };

  // 3. Process based on event type
  const event = body.event;
  const data = body.data;

  if (event === 'charge.success' || event === 'subscription.create') {
    // Find user by email
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', data.customer.email)
      .maybeSingle();

    if (!profiles) return { status: 404, error: 'User not found' };

    // Update user plan
    const plan = mapPaystackPlanToZawadiPlan(data.plan.plan_code);
    await supabaseAdmin
      .from('user_profiles')
      .update({
        plan,
        plan_expires_at: data.subscription?.next_payment_date || null
      })
      .eq('id', profiles.id);

    // Record payment
    await supabaseAdmin.from('payments').insert({
      user_id: profiles.id,
      paystack_reference: data.reference,
      paystack_subscription_code: data.subscription?.subscription_code,
      amount: data.amount,
      currency: data.currency,
      plan,
      status: 'success',
      webhook_event_id: body.event
    });
  }

  if (event === 'subscription.not_renew' || event === 'subscription.disable') {
    // Downgrade to free
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('paystack_subscription_code', data.subscription_code)
      .maybeSingle();

    if (profiles) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ plan: 'explorer', plan_expires_at: null })
        .eq('id', profiles.id);
    }
  }

  return { status: 200 };
}
```

---

## 5. Currency & Localization

### 5.1 Base Currency
- **Database price:** USD (stable reference)
- **Display price:** USD + local currency equivalent
- **Payment currency:** KES (Kenyan Shillings) via Paystack
- **Exchange rate:** Updated via Paystack's conversion at checkout time

### 5.2 Display Example (Kenya)
```
Scholar Plus
$5/month ≈ KES 650/month
$50/year ≈ KES 6,500/year (save 17%)
```

### 5.3 Currency Display Logic
```js
function formatPrice(usdAmount, localCurrency = 'KES') {
  const rates = { KES: 130 }; // approximate, Paystack handles exact conversion
  const localAmount = usdAmount * rates[localCurrency];
  return {
    usd: `$${usdAmount}`,
    local: `${localCurrency} ${localAmount.toLocaleString()}`
  };
}
```

---

## 6. Subscription Lifecycle

### 6.1 States
```
Free (explorer)
  → Upgrade initiated (payment pending)
  → Paid (plus/pro/mentor)
  → Grace period (payment failed, 3 days)
  → Downgraded (free, access until period end)
  → Cancelled (free, access until period end)
```

### 6.2 Upgrade Rules
- User can upgrade at any time (e.g., Plus → Pro)
- Proration handled by Paystack
- New plan effective immediately
- User cannot downgrade to a plan they already exceed limits on

### 6.3 Cancellation
- User cancels via Paystack dashboard or Zawadi support
- Access continues until end of current billing period
- On period end: plan reverts to `explorer`
- Data preserved (documents, applications) — just limits enforced

### 6.4 Failed Payment
- Paystack retries automatically (configurable)
- After 3 failures: subscription disabled
- User notified via email
- Grace period: 3 days before downgrade

---

## 7. Revenue Projections

| Metric | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Total Users | 1,000 | 10,000 | 50,000 |
| Paid Users (8% conv) | 80 | 800 | 4,000 |
| ARPU (blended) | $8/mo | $8/mo | $8/mo |
| Monthly Revenue | $640 | $6,400 | $32,000 |
| Annual Revenue | $7,680 | $76,800 | $384,000 |
| Supabase Cost | Free | $25/mo | $25/mo |
| Paystack Fees (1.5% + KES 1) | ~$115/yr | ~$1,152/yr | ~$5,760/yr |
| Net Revenue | ~$7,565 | ~$75,348 | ~$377,940 |

---

## 8. v2 Payment Improvements Over v1

| v1 Issue | v2 Fix |
|---|---|
| Manual Paystack plan code mapping | Centralized plan code config in `src/config/plans.js` |
| No webhook idempotency | `webhook_event_id` UNIQUE constraint |
| User could "downgrade" to same tier | Client-side check prevents paying for lower/equal tier |
| Plan not updating after payment | Webhook updates `user_profiles.plan` directly |
| No payment history | `payments` table with full records |
| KES display inaccurate | Real-time FX from Paystack at checkout |
| No downgrade on subscription end | `subscription.not_renew` webhook handler |

---

*Payment plans document reviewed by: _____________________ Date: _____________________*
