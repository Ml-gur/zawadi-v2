import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { SEO } from './SEO';
import { supabase } from '../lib/supabase';

// Plans matching specification
export interface PlanTier {
  id: string; // explorer, plus, pro, institutional
  name: string;
  usdMonthly: number;
  usdAnnual: number;
  kesMonthly: number;
  kesAnnual: number;
  monthlyPlanCode: string;
  annualPlanCode: string;
  badge?: string;
  description: string;
  features: string[];
  essayLimit: number;
  docLimit: string | number;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    usdMonthly: 0,
    usdAnnual: 0,
    kesMonthly: 0,
    kesAnnual: 0,
    monthlyPlanCode: 'free',
    annualPlanCode: 'free',
    description: 'Perfect for discovering opportunities and managing your first applications.',
    essayLimit: 3,
    docLimit: 15,
    features: [
      'Unlimited scholarship browsing',
      'Unlimited application tracking',
      'Basic match score overview',
      '3 AI essay drafts per day',
      '15 document vault uploads total',
      'Deadline urgency check indicators',
      '1 mentor review per month (basic)',
      'Document AI Intelligence (transcripts & essays)',
      'Community & FAQ support'
    ]
  },
  {
    id: 'plus',
    name: 'Scholar Plus',
    usdMonthly: 5,
    usdAnnual: 50,
    kesMonthly: 650,
    kesAnnual: 6500,
    monthlyPlanCode: 'PLN_unw5dchqqxx8h81',
    annualPlanCode: 'PLN_7lbcd0qe0atza2a',
    badge: 'Most Popular',
    description: 'Ideal for students managing multiple scholarship applications.',
    essayLimit: 10,
    docLimit: 50,
    features: [
      'Everything in Explorer',
      '10 AI essay drafts per day',
      '50 document vault uploads total',
      'Detailed match score breakdown',
      'Document gap analysis & reporting',
      'Advanced Document AI Intelligence (transcripts, CV, essays)',
      '2 structured mentor reviews per month',
      'Priority inclusion in new crawls',
      'Email support (within 48h)'
    ]
  },
  {
    id: 'pro',
    name: 'Application Pro',
    usdMonthly: 12,
    usdAnnual: 120,
    kesMonthly: 1560,
    kesAnnual: 15600,
    monthlyPlanCode: 'PLN_02f9ve9p86cpx44',
    annualPlanCode: 'PLN_r7qx092mwmn5bfz',
    badge: 'Best Value',
    description: 'Built for students who want maximum efficiency and a competitive advantage.',
    essayLimit: 25,
    docLimit: 'Unlimited',
    features: [
      'Everything in Scholar Plus',
      '25 AI essay drafts per day',
      'Unlimited document vault uploads',
      'Full Interactive Document Intelligence AI',
      'Essay voice machine learning (from 3+ samples)',
      'Advanced strategy and admission insights',
      '4 full mentor reviews per month (with revised sections)',
      'Priority email support (within 24h)'
    ]
  }
];

interface SubscriptionPlansProps {
  user: any;
  onPlanUpdated: (updatedUser: any) => void;
  onNavigateToTab: (tab: string) => void;
}


// Paystack inline.js is injected on first checkout use — never on page load
let paystackPopPromise: Promise<boolean> | null = null;
function ensurePaystackPop(): Promise<boolean> {
  if ((window as any).PaystackPop) return Promise.resolve(true);
  if (paystackPopPromise) return paystackPopPromise;
  paystackPopPromise = new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => resolve(Boolean((window as any).PaystackPop));
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return paystackPopPromise;
}

export default function SubscriptionPlans({ user, onPlanUpdated, onNavigateToTab }: SubscriptionPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activePlan, setActivePlan] = useState<string>(user?.plan || 'explorer');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('mobile_money');
  const [mobilePhone, setMobilePhone] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');

  const [successAnimation, setSuccessAnimation] = useState<boolean>(false);

  useEffect(() => {
    if (user?.plan) {
      setActivePlan(user.plan.toLowerCase());
    }
  }, [user?.plan]);

  const triggerToast = (msg: string) => {
    toast(msg);
  };

  const getPrice = (plan: PlanTier) => {
    if (billingCycle === 'monthly') {
      return { usd: plan.usdMonthly, kes: plan.kesMonthly, suffix: '/mo', code: plan.monthlyPlanCode };
    } else {
      return { usd: plan.usdAnnual, kes: plan.kesAnnual, suffix: '/yr', code: plan.annualPlanCode };
    }
  };

  const handleCheckoutClick = (plan: PlanTier) => {
    if (plan.id === 'explorer') {
      triggerToast('Explorer is our standard free-forever tier.');
      return;
    }
    
    // Prevent subscribing to lower/equal plan if already paid
    const planHierarchy = ['explorer', 'plus', 'pro', 'institutional'];
    const currentIdx = planHierarchy.indexOf(activePlan);
    const targetIdx = planHierarchy.indexOf(plan.id);

    if (currentIdx > targetIdx) {
      triggerToast(`You are already on a higher premium tier: ${user.plan.toUpperCase()}. Downscaling plans is disabled during billing cycle.`);
      return;
    }

    if (currentIdx === targetIdx) {
      triggerToast(`You are already subscribed to the ${plan.name} tier!`);
      return;
    }

    setPaymentMethod('mobile_money');
    setMobilePhone('');
    setSelectedPlan(plan);
    setShowCheckoutModal(true);
  };

  const isMobilePhoneValid = paymentMethod !== 'mobile_money' || /^\+?\d{9,15}$/.test(mobilePhone.replace(/\s/g, ''));
  const isCardValid = paymentMethod !== 'card' || (
    cardNumber.replace(/\s/g, '').length >= 16 &&
    /^\d{2}\/\d{2}$/.test(cardExpiry) &&
    cardCvv.length >= 3 &&
    cardName.trim().length >= 2
  );
  const isPaymentDetailsComplete = paymentMethod === 'mobile_money' ? isMobilePhoneValid && mobilePhone.trim() !== '' : isCardValid;

  // Proper hosted subscription flow:
  //   1. Call process-payment Edge Function (action: initialize) → creates a trusted payment intent
  //   2. Open popup with access_code (live) or direct reference (sandbox)
  //   3. User pays → callback fires
  //   4. Call process-payment Edge Function (action: verify) → server verifies transaction before activation
  const handleInitiatePayment = async () => {
    if (!selectedPlan) return;
    if (!isMobilePhoneValid) {
      triggerToast('Enter a valid mobile money phone number before continuing.');
      return;
    }
    setIsProcessing(true);

    const priceInfo = getPrice(selectedPlan);
    const planCode = priceInfo.code;
    const amountKES = priceInfo.kes;
    const publicPaystackKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY;
    const hasPaystackPop = await ensurePaystackPop();

    // Step 1 — Server-side initialize (creates transaction + subscription on Paystack)
    let accessCode: string | null = null;
    let paystackRef: string | null = null;
    let trustedAmountKES = amountKES;
    let authorizationUrl: string | null = null;
    try {
      const { data: initData, error: initError } = await supabase.functions.invoke('process-payment', {
        body: {
          action: 'initialize',
          plan_name: selectedPlan.id,
          plan_code: planCode,
          billing_period: billingCycle,
          payment_method: paymentMethod,
          phone_number: paymentMethod === 'mobile_money' ? mobilePhone : undefined,
          amount: amountKES
        }
      });
      if (initError || initData?.error) {
        triggerToast(initData?.error || initError?.message || 'Payment initialization failed.');
        setIsProcessing(false);
        return;
      }
      accessCode = initData.access_code;
      paystackRef = initData.reference;
      trustedAmountKES = initData.amount || amountKES;
      authorizationUrl = initData.authorization_url;
    } catch (err) {
      console.error(err);
        triggerToast('Could not reach the billing server. Payment initialization failed.');
        setIsProcessing(false);
        return;
      }

    // Step 2 — Open hosted checkout (live) or simulate (sandbox)
    if (publicPaystackKey && accessCode && !accessCode.startsWith('sandbox_')) {
      if (paymentMethod === 'mobile_money' && authorizationUrl) {
        // Mobile money works best with a full-page redirect (STK push may not work in iframes)
        // Payment details are passed via Paystack metadata & query params on callback
        window.location.href = authorizationUrl;
        return;
      }

      // Card payments work well with Paystack Pop inline
      if (hasPaystackPop) {
        try {
          (window as any).PaystackPop.setup({
            key: publicPaystackKey,
            access_code: accessCode,
              callback: async (response: any) => {
              triggerToast('Transaction completed. Verifying securely...');
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke('process-payment', {
                body: {
                  action: 'verify',
                  user_email: user?.email,
                  reference: response.reference || paystackRef,
                  plan_name: selectedPlan.id,
                  plan_code: planCode,
                  billing_period: billingCycle,
                  amount: trustedAmountKES
                }
              });
              if (!verifyError && !verifyData?.error && verifyData?.success) {
                setSuccessAnimation(true);
                setTimeout(() => {
                  onPlanUpdated(verifyData.user);
                  setShowCheckoutModal(false);
                  setSuccessAnimation(false);
                  setIsProcessing(false);
                }, 2500);
              } else {
                triggerToast(verifyData?.error || verifyError?.message || 'Payment verification failed.');
                setIsProcessing(false);
              }
            },
            onClose: () => {
              if (paystackRef) {
                supabase.functions.invoke('process-payment', {
                  body: { action: 'abandon', reference: paystackRef }
                }).catch(() => undefined);
              }
              triggerToast('Payment closed early or canceled.');
              setIsProcessing(false);
            }
          }).open();
          return;
        } catch (paystackError) {
          console.error('Hosted checkout error, falling back to redirect:', paystackError);
          if (authorizationUrl) {
            window.location.href = authorizationUrl;
            return;
          }
        }
      } else if (authorizationUrl) {
        // PaystackPop not loaded — redirect directly to authorization URL
        window.location.href = authorizationUrl;
        return;
      }
    }

    // Sandbox: simulate a payment delay then verify
    setTimeout(async () => {
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('process-payment', {
          body: {
            action: 'verify',
            user_email: user?.email,
            reference: paystackRef || `sandbox_${Date.now()}`,
            plan_name: selectedPlan.id,
            plan_code: planCode,
            billing_period: billingCycle,
            amount: trustedAmountKES
          }
        });
        if (!verifyError && !verifyData?.error && verifyData?.success) {
          setSuccessAnimation(true);
          setTimeout(() => {
            onPlanUpdated(verifyData.user);
            setShowCheckoutModal(false);
            setSuccessAnimation(false);
            setIsProcessing(false);
          }, 3000);
        } else {
          triggerToast(verifyData?.error || verifyError?.message || 'Payment verification failed. Please try again or contact support.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error(err);
        triggerToast('Could not reach backend server. Retry shortly.');
        setIsProcessing(false);
      }
    }, 2800);
  };

  const cardTone = (planId: string) =>
    planId === 'plus'
      ? 'bg-pure-white border-2 border-off-black-ink'
      : planId === 'pro'
        ? 'bg-deep-charcoal text-pure-white border-transparent'
        : 'bg-parchment border-ash';

  const isDarkCard = (planId: string) => planId === 'pro';

  const inputClass =
    'w-full bg-parchment border border-ash rounded-lg px-4 py-3 text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors text-ed-body-sm';

  return (
    <div className="bg-pure-white text-off-black-ink">
      <SEO title="Plans & Pricing | Techsari" description="Free Explorer tier plus Scholar Plus and Application Pro plans. Pay in KES via M-Pesa or card." path="/subscriptionplans" noindex />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 md:py-24 space-y-14 md:space-y-20 animate-sweep">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span className="block text-ed-eyebrow uppercase tracking-[0.18em] text-graphite mb-3">Pricing</span>
            <h2 className="text-ed-h1-sm font-medium tracking-tight text-off-black-ink max-w-xl">
              Pay only when you&rsquo;re ready to win.
            </h2>
            <p className="text-ed-body text-graphite mt-3 max-w-lg">
              Elevate your application quota limits, AI tools coefficient speeds, and human support channels
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('dashboard')}
            className="inline-flex shrink-0 items-center gap-2 self-start md:self-auto rounded-full border border-off-black-ink px-5 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink transition-colors hover:bg-off-black-ink hover:text-pure-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Workspace Dashboard
          </button>
        </div>

        {/* Current Active Plan Summary Card */}
        <div className="rounded-ed border border-ash bg-parchment p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-electric-lime flex items-center justify-center text-off-black-ink shrink-0">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-ed-sub font-medium tracking-tight text-off-black-ink">
                  Current Subscription Level: {PLAN_TIERS.find(t => t.id === activePlan)?.name || activePlan.toUpperCase()}
                </h3>
                <span className="rounded-full bg-electric-lime px-2.5 py-0.5 text-ed-caption uppercase tracking-wide text-off-black-ink font-medium">
                  Active Tier
                </span>
              </div>
              <p className="text-ed-body-sm text-graphite mt-1">
                Your academic profile is bound to local storage and computation quotas. Upgrades are synchronized live across application nodes.
              </p>
            </div>
          </div>

          {activePlan === 'explorer' && (
            <div className="text-left md:text-right shrink-0">
              <p className="text-ed-caption uppercase tracking-wide text-graphite">Storage Status</p>
              <p className="text-ed-body-sm font-medium text-off-black-ink mt-1">Explorer Vault: 15 Document Quota max</p>
              <p className="text-ed-caption text-graphite mt-0.5">Please upgrade to unlock unlimited uploads & document AI intelligence</p>
            </div>
          )}
        </div>

        {/* Monthly vs Annual billing switch */}
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-1 rounded-full border border-ash bg-pure-white p-1.5">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 min-h-[40px] rounded-full text-ed-body-sm font-medium transition-colors cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-off-black-ink text-pure-white'
                  : 'text-graphite hover:text-off-black-ink'
              }`}
            >
              Monthly Period
            </button>

            <button
              onClick={() => setBillingCycle('annual')}
              className={`relative inline-flex items-center gap-2 px-5 min-h-[40px] rounded-full text-ed-body-sm font-medium transition-colors cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-off-black-ink text-pure-white'
                  : 'text-graphite hover:text-off-black-ink'
              }`}
            >
              <span>Annual (Pre-paid)</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium ${
                billingCycle === 'annual' ? 'bg-electric-lime text-off-black-ink' : 'border border-ash text-graphite'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
          <p className="text-ed-caption text-graphite">USD base rates approximated against stable Kes conversion index. Secure payment processing for African markets.</p>
        </div>

        {/* Human mentor feedback banner */}
        <div className="rounded-ed border border-ash bg-parchment p-5 text-center">
          <p className="text-ed-body-sm text-deep-charcoal">
            Every plan includes real human mentor feedback.{' '}
            <span className="text-stone" aria-hidden>·</span>{' '}
            We are an African platform built to help African students.{' '}
            <span className="text-stone" aria-hidden>·</span>{' '}
            The fees keep us running, not to restrict you.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLAN_TIERS.map(plan => {
            const isCurrent = activePlan === plan.id;
            const price = getPrice(plan);
            const dark = isDarkCard(plan.id);

            return (
              <div
                key={plan.id}
                className={`rounded-ed border flex flex-col justify-between p-7 relative transition-colors duration-300 ${
                  isCurrent ? 'outline outline-2 outline-offset-4 outline-electric-lime' : ''
                } ${cardTone(plan.id)}`}
              >
                {/* Highlight badge */}
                {plan.badge && (
                  <span className="absolute -top-3.5 right-6 rounded-full bg-electric-lime px-3 py-1 text-ed-caption uppercase tracking-wide text-off-black-ink font-medium">
                    {plan.badge}
                  </span>
                )}

                <div>
                  {/* Header */}
                  <div className="space-y-1">
                    <h4 className={`text-ed-body font-medium uppercase tracking-wide ${dark ? 'text-pure-white' : 'text-off-black-ink'}`}>{plan.name}</h4>
                    <p className={`text-ed-body-sm min-h-[48px] leading-relaxed ${dark ? 'text-smoke' : 'text-graphite'}`}>{plan.description}</p>
                  </div>

                  {/* Price tag */}
                  <div className={`pt-4 pb-4 border-b ${dark ? 'border-stone' : 'border-ash'}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-ed-h1-sm font-medium tracking-tight ${dark ? 'text-pure-white' : 'text-off-black-ink'}`}>
                        {price.kes > 0 ? `KES ${price.kes.toLocaleString()}` : `$${price.usd}`}
                      </span>
                      <span className={`text-ed-body-sm ${dark ? 'text-smoke' : 'text-graphite'}`}>{price.suffix}</span>
                    </div>
                    {price.kes > 0 ? (
                      <p className={`text-ed-caption mt-1 ${dark ? 'text-smoke' : 'text-graphite'}`}>
                        ≈ ${price.usd}
                      </p>
                    ) : (
                      <p className={`text-ed-caption mt-1 ${dark ? 'text-smoke' : 'text-graphite'}`}>Free-forever tier</p>
                    )}
                  </div>

                  {/* Main Quota Highlights */}
                  <div className={`py-4 space-y-2 border-b text-ed-body-sm ${dark ? 'border-stone' : 'border-ash'}`}>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-smoke' : 'text-graphite'}>AI essays/day:</span>
                      <span className={`font-medium ${dark ? 'text-electric-lime' : 'text-off-black-ink'}`}>{plan.essayLimit} drafts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={dark ? 'text-smoke' : 'text-graphite'}>Document uploads:</span>
                      <span className={`font-medium ${dark ? 'text-electric-lime' : 'text-off-black-ink'}`}>{plan.docLimit} files</span>
                    </div>
                  </div>

                  {/* Bullet checklist */}
                  <ul className="py-5 space-y-3">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-ed-body-sm leading-snug">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${dark ? 'text-electric-lime' : 'text-graphite'}`}
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Purchase button trigger */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleCheckoutClick(plan)}
                    disabled={isCurrent}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-full min-h-[48px] px-6 text-ed-body-sm font-medium transition-all ${
                      isCurrent
                        ? 'border border-ash text-graphite opacity-60 pointer-events-none'
                        : 'bg-electric-lime text-off-black-ink hover:bg-lime-hover active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <ShieldCheck className="w-4 h-4" strokeWidth={1.5} aria-hidden />
                        <span>Current Level</span>
                      </>
                    ) : (
                      'Upgrade Subscription Level'
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Institutional — B2B Section */}
        <div className="rounded-ed border border-ash bg-parchment p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-ash px-3 py-1 text-ed-caption uppercase tracking-wide text-graphite font-medium">B2B / Institutional</span>
                <span className="rounded-full bg-electric-lime px-3 py-1 text-ed-caption uppercase tracking-wide text-off-black-ink font-medium">Custom Pricing</span>
              </div>
              <h3 className="text-ed-sub font-medium tracking-tight text-off-black-ink">Techsari Institutional</h3>
              <p className="text-ed-body-sm text-graphite max-w-2xl leading-relaxed">
                For universities, NGOs, scholarship programs, and government agencies that want to provide
                Techsari's full platform to their students, scholars, or beneficiaries at scale.
              </p>
              <ul className="space-y-2.5 pt-2">
                {[
                  'Unlimited AI essay drafts for all affiliated students',
                  'Unlimited document vault uploads with full AI intelligence',
                  'Unlimited mentor reviews (full_plus with strategy sessions)',
                  'Essay voice machine learning for every student',
                  'Dedicated account manager & implementation specialist',
                  'Custom branding & white-label options',
                  'Bulk student onboarding & CSV import',
                  'Priority support with SLA guarantee (within 4h)',
                  'Monthly analytics & impact reporting dashboard',
                  'API access for custom integrations'
                ].map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-ed-body-sm text-off-black-ink leading-snug">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-graphite" strokeWidth={1.5} aria-hidden />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 text-left md:text-right">
              <p className="text-ed-caption uppercase tracking-wide text-graphite mb-1">Starting From</p>
              <p className="text-ed-h1-sm font-medium tracking-tight text-off-black-ink">Custom</p>
              <p className="text-ed-body-sm text-graphite mt-1">Volume-based pricing • Per-seat or flat rate</p>
              <a
                href="mailto:partnerships@Techsari.app?subject=Techsari%20Institutional%20Plan%20Inquiry"
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-off-black-ink px-7 min-h-[48px] text-ed-body-sm font-medium text-off-black-ink transition-colors hover:bg-off-black-ink hover:text-pure-white"
              >
                Contact Partnerships
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix Accordion/Section */}
        <div className="rounded-ed border border-ash bg-pure-white p-6 md:p-8 overflow-hidden">
          <div className="border-b border-ash pb-4 mb-6">
            <h3 className="text-ed-sub font-medium tracking-tight text-off-black-ink flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5" strokeWidth={1.5} aria-hidden />
              Subscription Quota Contrast Metrics
            </h3>
            <p className="text-ed-body-sm text-graphite mt-1">Comprehensive grid comparing feature allocation details across academic levels</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-ed-body-sm">
              <thead>
                <tr className="bg-parchment">
                  <th className="py-3.5 px-4 text-ed-caption uppercase tracking-wide text-graphite font-medium">Compare Metric Capability</th>
                  <th className="py-3.5 px-4 text-ed-caption uppercase tracking-wide text-graphite font-medium">Explorer</th>
                  <th className="py-3.5 px-4 text-ed-caption uppercase tracking-wide text-off-black-ink font-medium">Scholar Plus</th>
                  <th className="py-3.5 px-4 text-ed-caption uppercase tracking-wide text-graphite font-medium">App Pro</th>
                  <th className="py-3.5 px-4 text-ed-caption uppercase tracking-wide text-graphite font-medium">Institutional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ash text-off-black-ink">
                <tr>
                  <td className="py-3.5 px-4 font-medium">Daily AI essays generation</td>
                  <td className="py-3.5 px-4 text-graphite">3 drafts</td>
                  <td className="py-3.5 px-4">10 drafts</td>
                  <td className="py-3.5 px-4">25 drafts</td>
                  <td className="py-3.5 px-4 text-graphite">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Max document storage count</td>
                  <td className="py-3.5 px-4 text-graphite">15 files</td>
                  <td className="py-3.5 px-4">50 files</td>
                  <td className="py-3.5 px-4">Unlimited</td>
                  <td className="py-3.5 px-4 text-graphite">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Scholarship listings browsing</td>
                  <td className="py-3.5 px-4 text-graphite">Unlimited</td>
                  <td className="py-3.5 px-4">Unlimited</td>
                  <td className="py-3.5 px-4">Unlimited</td>
                  <td className="py-3.5 px-4 text-graphite">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Match score accuracy precision</td>
                  <td className="py-3.5 px-4 text-graphite">Basic overview</td>
                  <td className="py-3.5 px-4">Detailed breakdown</td>
                  <td className="py-3.5 px-4">Detailed breakdown</td>
                  <td className="py-3.5 px-4 text-graphite">Detailed breakdown</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Document vault gap analyses</td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} aria-hidden /><span className="sr-only">Included</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} aria-hidden /><span className="sr-only">Included</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-graphite" strokeWidth={1.5} aria-hidden /><span className="sr-only">Included</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Document intelligence (AI assistance)</td>
                  <td className="py-3.5 px-4 text-graphite">Transcripts only</td>
                  <td className="py-3.5 px-4">Basic (transcripts, CV, essays)</td>
                  <td className="py-3.5 px-4">Full processing</td>
                  <td className="py-3.5 px-4 text-graphite">Full processing</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Robotic Auto-Apply Engine</td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} aria-hidden /><span className="sr-only">Fully available</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-graphite" strokeWidth={1.5} aria-hidden /><span className="sr-only">Fully available</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Essay voice fingerprint learning</td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} aria-hidden /><span className="sr-only">Enabled</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-graphite" strokeWidth={1.5} aria-hidden /><span className="sr-only">Enabled</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Human advisory & essay review</td>
                  <td className="py-3.5 px-4 text-graphite">1 basic / mo</td>
                  <td className="py-3.5 px-4">2 structured / mo</td>
                  <td className="py-3.5 px-4">4 full (revised) / mo</td>
                  <td className="py-3.5 px-4 text-graphite">Unlimited full_plus</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">1-on-1 strategy sessions</td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><X className="w-4 h-4 text-error" strokeWidth={1.5} aria-hidden /><span className="sr-only">Unavailable</span></td>
                  <td className="py-3.5 px-4"><CheckCircle2 className="w-4 h-4 text-graphite" strokeWidth={1.5} aria-hidden /><span className="sr-only">Available</span></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Support priority SLA</td>
                  <td className="py-3.5 px-4 text-graphite">FAQ / Community</td>
                  <td className="py-3.5 px-4">Email (48h response)</td>
                  <td className="py-3.5 px-4">Priority Email (24h)</td>
                  <td className="py-3.5 px-4 text-graphite">Dedicated SLA (4h)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Secure Payment Checkout Modal */}
        {showCheckoutModal && selectedPlan && (
          <div id="checkout_gateway_modal" className="fixed inset-0 bg-off-black-ink/70 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in px-4">
            <div className="w-full max-w-lg bg-pure-white border border-ash rounded-ed overflow-hidden flex flex-col relative animate-scale-up max-h-[90vh] overflow-y-auto">

              {/* Header branding */}
              <div className="p-6 border-b border-ash bg-parchment flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-off-black-ink flex items-center justify-center text-pure-white shrink-0">
                    <Lock className="w-4 h-4" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-ed-sub font-medium tracking-tight text-off-black-ink">Secure Payment Gateway</h3>
                    <p className="text-ed-caption uppercase tracking-wide text-graphite mt-0.5">PCI-DSS Level 1 Protected</p>
                  </div>
                </div>
                <button
                  onClick={() => !isProcessing && setShowCheckoutModal(false)}
                  disabled={isProcessing}
                  className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-graphite transition-colors hover:text-off-black-ink hover:border-ash disabled:opacity-40"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                </button>
              </div>

              {/* Content Body */}
              {successAnimation ? (
                <div className="m-6 rounded-lg border border-off-black-ink/20 bg-electric-lime/20 p-10 text-center space-y-4 animate-scale-up flex flex-col items-center justify-center min-h-[340px]">
                  <div className="w-16 h-16 rounded-full bg-electric-lime text-off-black-ink flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} aria-hidden />
                  </div>
                  <h4 className="text-ed-sub font-medium tracking-tight text-off-black-ink mt-2">Subscription Activated!</h4>
                  <p className="text-ed-body-sm text-graphite max-w-sm leading-relaxed">
                    Payment verified successfully. Welcome to the <span className="font-medium text-off-black-ink">{selectedPlan.name}</span> tier! All features are now active.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-5 flex-1">
                  {/* Selected tier recap */}
                  <div className="bg-parchment p-4 rounded-lg border border-ash flex justify-between items-center">
                    <div>
                      <p className="text-ed-caption uppercase tracking-wide text-graphite">Academic Subscription</p>
                      <p className="text-ed-body font-medium text-off-black-ink mt-0.5">{selectedPlan.name} Tier ({billingCycle})</p>
                      <p className="text-ed-caption text-graphite mt-0.5">Billed immediately on payment confirmation</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-off-black-ink">KES {getPrice(selectedPlan).kes.toLocaleString()}</p>
                      <p className="text-ed-caption text-graphite">≈ ${getPrice(selectedPlan).usd}</p>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <p className="text-ed-body-sm font-medium text-off-black-ink mb-2">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('mobile_money'); setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardName(''); }}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border cursor-pointer transition-colors text-ed-body-sm font-medium ${
                          paymentMethod === 'mobile_money'
                            ? 'border-off-black-ink bg-parchment text-off-black-ink'
                            : 'border-ash text-graphite hover:border-graphite'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                        Mobile Money
                        <span className="text-ed-caption text-graphite font-normal">M-Pesa, Airtel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('card'); setMobilePhone(''); }}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border cursor-pointer transition-colors text-ed-body-sm font-medium ${
                          paymentMethod === 'card'
                            ? 'border-off-black-ink bg-parchment text-off-black-ink'
                            : 'border-ash text-graphite hover:border-graphite'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" strokeWidth={1.5} aria-hidden />
                        Debit / Credit Card
                        <span className="text-ed-caption text-graphite font-normal">Visa, Mastercard</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Money Fields */}
                  {paymentMethod === 'mobile_money' && (
                    <div className="space-y-3 animate-sweep">
                      <div>
                        <label className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">Mobile Number <span className="text-error">*</span></label>
                        <div className="relative">
                          <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" strokeWidth={1.5} aria-hidden />
                          <input
                            type="tel"
                            value={mobilePhone}
                            onChange={e => setMobilePhone(e.target.value)}
                            placeholder="e.g. +254712345678"
                            className={`${inputClass} pl-10`}
                          />
                        </div>
                        <p className="text-ed-caption text-graphite mt-1">Enter your M-Pesa or Airtel Money number. You will receive a payment prompt on your phone.</p>
                        {mobilePhone && !isMobilePhoneValid && (
                          <p className="text-ed-caption text-error mt-1">Please enter a valid phone number (9-15 digits).</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Fields */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-3 animate-sweep">
                      <div>
                        <label className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">Cardholder Name <span className="text-error">*</span></label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                          placeholder="As shown on your card"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">Card Number <span className="text-error">*</span></label>
                        <div className="relative">
                          <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" strokeWidth={1.5} aria-hidden />
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => {
                              const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                              setCardNumber(v.replace(/(\d{4})/g, '$1 ').trim());
                            }}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            className={`${inputClass} pl-10 font-mono`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">Expiry Date <span className="text-error">*</span></label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => {
                              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                              setCardExpiry(v);
                            }}
                            placeholder="MM/YY"
                            maxLength={5}
                            className={`${inputClass} font-mono`}
                          />
                        </div>
                        <div>
                          <label className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">CVV / CVC <span className="text-error">*</span></label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••"
                            maxLength={4}
                            className={`${inputClass} font-mono`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-ed-caption text-graphite">
                        <Lock className="w-4 h-4 text-graphite shrink-0" strokeWidth={1.5} aria-hidden />
                        Your card details are encrypted and never stored on our servers.
                      </div>
                    </div>
                  )}

                  {/* Processing indicator */}
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-3 py-3 animate-sweep">
                      <div className="w-5 h-5 rounded-full border-2 border-ash border-t-off-black-ink animate-spin"></div>
                      <span className="text-ed-body-sm font-medium text-off-black-ink">
                        {paymentMethod === 'mobile_money'
                          ? 'Opening Paystack to send payment prompt to your phone...'
                          : 'Opening secure card payment gateway...'}
                      </span>
                    </div>
                  )}

                  {/* Secure Gateway disclaimer */}
                  <div className="flex items-start gap-2 text-ed-caption text-graphite leading-relaxed bg-parchment p-3 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-graphite shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden />
                    <span>All payments are encrypted with TLS 1.3 and processed through PCI-DSS Level 1 certified infrastructure. Your payment details are never stored on our servers.</span>
                  </div>
                </div>
              )}

              {/* Modal actions footer */}
              {!successAnimation && (
                <div className="p-6 border-t border-ash flex gap-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 rounded-full border border-ash min-h-[48px] text-ed-body-sm font-medium text-graphite hover:border-off-black-ink hover:text-off-black-ink transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || !isPaymentDetailsComplete}
                    onClick={handleInitiatePayment}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full min-h-[48px] px-6 text-ed-body-sm font-medium transition-all ${
                      isProcessing || !isPaymentDetailsComplete
                        ? 'border border-ash text-stone opacity-60 pointer-events-none'
                        : 'bg-electric-lime text-off-black-ink hover:bg-lime-hover active:scale-[0.98] cursor-pointer'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-off-black-ink/20 border-t-off-black-ink animate-spin"></div>
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" strokeWidth={1.5} aria-hidden />
                        <span>
                          {!isPaymentDetailsComplete
                            ? `Enter ${paymentMethod === 'mobile_money' ? 'phone number' : 'card details'} above`
                            : 'Authorize Payment'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
