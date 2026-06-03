import React, { useState, useEffect } from 'react';
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
  const [infoToast, setInfoToast] = useState<string>('');

  useEffect(() => {
    if (user?.plan) {
      setActivePlan(user.plan.toLowerCase());
    }
  }, [user?.plan]);

  const triggerToast = (msg: string) => {
    setInfoToast(msg);
    setTimeout(() => setInfoToast(''), 4500);
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
    const hasPaystackPop = !!(window as any).PaystackPop;

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
          triggerToast(verifyData?.error || verifyError?.message || 'Sandbox upgrade failed. Check server logs.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error(err);
        triggerToast('Could not reach backend server. Retry shortly.');
        setIsProcessing(false);
      }
    }, 2800);
  };

  return (
    <div className="space-y-8 animate-sweep">
      
      {/* Toast Notice */}
      {infoToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-primary text-on-primary rounded-2xl shadow-xl text-xs font-bold animate-slide-in-right flex items-center gap-2 max-w-sm">
          <span className="material-symbols-outlined text-base">info</span>
          <span>{infoToast}</span>
        </div>
      )}

      {/* Hero Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">Affordable Premium Billing v2</span>
          <h2 className="font-display text-2xl font-black text-primary">Academic Subscription Center</h2>
          <p className="text-xs text-on-surface-variant">Elevate your application quota limits, AI tools coefficient speeds, and human support channels</p>
        </div>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="bg-surface hover:bg-surface-variant text-primary border border-outline-variant/60 font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all w-max shrink-0 flex items-center gap-1.5 font-sans"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Workspace Dashboard
        </button>
      </div>

      {/* Current Active Plan Summary Card */}
      <div className="premium-glass p-6 rounded-3xl border border-outline-variant/40 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">workspace_premium</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base text-primary">
                Current Subscription Level: {PLAN_TIERS.find(t => t.id === activePlan)?.name || activePlan.toUpperCase()}
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                Active Tier
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Your academic profile is bound to local storage and computation quotas. Upgrades are synchronized live across application nodes.
            </p>
          </div>
        </div>

        {activePlan === 'explorer' && (
          <div className="text-left md:text-right shrink-0">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Storage Status</p>
            <p className="text-xs text-on-surface font-semibold mt-1">Explorer Vault: 15 Document Quota max</p>
            <p className="text-[10px] text-amber-500 mt-0.5">Please upgrade to unlock unlimited uploads & document AI intelligence</p>
          </div>
        )}
      </div>

      {/* Monthly vs Annual billing switch */}
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className="inline-flex bg-surface-container border border-outline-variant/50 p-1.5 rounded-2xl items-center gap-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Monthly Period
          </button>
          
          <button
            onClick={() => setBillingCycle('annual')}
            className={`relative px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              billingCycle === 'annual'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Annual (Pre-paid)</span>
            <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Save 17%</span>
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant font-medium">USD base rates approximated against stable Kes conversion index. Secure payment processing for African markets.</p>
      </div>

      {/* Human mentor feedback banner */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-secondary/30 rounded-2xl p-4 text-center">
        <p className="text-xs font-bold text-on-surface">
          <span className="text-secondary">✦</span> Every plan includes real human mentor feedback.{' '}
          <span className="text-secondary">✦</span> We are an African platform built to help African students.{' '}
          <span className="text-secondary">✦</span> The fees keep us running, not to restrict you.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLAN_TIERS.map(plan => {
          const isCurrent = activePlan === plan.id;
          const price = getPrice(plan);

          return (
            <div 
              key={plan.id}
              className={`premium-glass rounded-3xl border flex flex-col justify-between p-6 relative transition-all duration-300 hover:shadow-md ${
                isCurrent 
                  ? 'border-2 border-primary ring-2 ring-primary/15 bg-primary/2' 
                  : 'border-outline-variant/40 hover:border-primary/45'
              }`}
            >
              {/* Highlight badge */}
              {plan.badge && (
                <span className="absolute -top-3 right-6 bg-gradient-to-r from-primary to-secondary text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div>
                {/* Header */}
                <div className="space-y-1">
                  <h4 className="font-display font-black text-sm text-primary uppercase tracking-wide">{plan.name}</h4>
                  <p className="text-[11px] text-on-surface-variant min-h-[48px] leading-relaxed">{plan.description}</p>
                </div>

                {/* Price tag */}
                <div className="pt-4 pb-2 border-b border-outline-variant/30">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-black text-2xl text-on-surface">${price.usd}</span>
                    <span className="text-xs text-on-surface-variant uppercase font-bold">{price.suffix}</span>
                  </div>
                  {price.kes > 0 ? (
                    <p className="text-xs font-extrabold text-secondary mt-0.5">
                      ≈ KES {price.kes.toLocaleString()}{price.suffix}
                    </p>
                  ) : (
                    <p className="text-xs font-extrabold text-secondary mt-0.5">Free-forever tier</p>
                  )}
                </div>

                {/* Main Quota Highlights */}
                <div className="py-4 space-y-2 border-b border-outline-variant/30 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-on-surface-variant">AI essays/day:</span>
                    <span className="text-primary font-black">{plan.essayLimit} drafts</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-on-surface-variant">Document uploads:</span>
                    <span className="text-primary font-black">{plan.docLimit} files</span>
                  </div>
                </div>

                {/* Bullet checklist */}
                <ul className="py-4 space-y-2.5">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] leading-normal font-bold text-on-surface">
                      <span className="material-symbols-outlined text-primary text-base shrink-0">check_circle</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Purchase button trigger */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleCheckoutClick(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isCurrent 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 cursor-not-allowed text-center flex items-center justify-center gap-1.5'
                      : 'bg-primary hover:bg-primary/95 text-white shadow-sm hover:translate-y-[-1px]'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <span className="material-symbols-outlined text-[14px]">verified_user</span>
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

      {/* Zawadi Institutional — B2B Section */}
      <div className="premium-glass rounded-3xl border-2 border-secondary/40 bg-gradient-to-br from-secondary/5 to-primary/5 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="bg-secondary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">B2B / Institutional</span>
              <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Custom Pricing</span>
            </div>
            <h3 className="font-display text-2xl font-black text-primary">Zawadi Institutional</h3>
            <p className="text-sm text-on-surface-variant max-w-2xl leading-relaxed">
              For universities, NGOs, scholarship programs, and government agencies that want to provide 
              Zawadi's full platform to their students, scholars, or beneficiaries at scale.
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
                <li key={idx} className="flex items-start gap-2 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-secondary text-base shrink-0">check_circle</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="shrink-0 text-center md:text-right">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Starting From</p>
            <p className="font-display text-3xl font-black text-primary">Custom</p>
            <p className="text-xs text-on-surface-variant mt-1">Volume-based pricing • Per-seat or flat rate</p>
            <a
              href="mailto:partnerships@zawadi.app?subject=Zawadi%20Institutional%20Plan%20Inquiry"
              className="inline-block mt-4 bg-secondary hover:bg-secondary/90 text-white font-extrabold text-xs py-3 px-8 rounded-xl transition-all shadow-sm"
            >
              Contact Partnerships →
            </a>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix Accordion/Section */}
      <div className="premium-glass p-6 md:p-8 rounded-3xl border border-outline-variant/45 shadow-sm">
        <div className="border-b border-outline-variant/30 pb-4 mb-6">
          <h3 className="font-display text-lg font-black text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            Subscription Quota Contrast Metrics
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">Comprehensive grid comparing feature allocation details across academic levels</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/45">
                <th className="py-3 px-4 font-black uppercase text-on-surface-variant text-[10px]">Compare Metric Capability</th>
                <th className="py-3 px-4 font-black uppercase text-on-surface-variant text-[10px]">Explorer</th>
                <th className="py-3 px-4 font-black uppercase text-on-surface-variant text-[10px] text-primary">Scholar Plus</th>
                <th className="py-3 px-4 font-black uppercase text-on-surface-variant text-[10px]">App Pro</th>
                <th className="py-3 px-4 font-black uppercase text-on-surface-variant text-[10px] text-secondary">Institutional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-bold text-on-surface">
              <tr>
                <td className="py-3 px-4">Daily AI essays generation</td>
                <td className="py-3 px-4 text-on-surface-variant">3 drafts</td>
                <td className="py-3 px-4 text-primary">10 drafts</td>
                <td className="py-3 px-4">25 drafts</td>
                <td className="py-3 px-4 text-secondary">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Max document storage count</td>
                <td className="py-3 px-4 text-on-surface-variant">15 files</td>
                <td className="py-3 px-4 text-primary">50 files</td>
                <td className="py-3 px-4 text-emerald-600">Unlimited</td>
                <td className="py-3 px-4 text-secondary">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Scholarship listings browsing</td>
                <td className="py-3 px-4 text-on-surface-variant">Unlimited</td>
                <td className="py-3 px-4 text-primary">Unlimited</td>
                <td className="py-3 px-4">Unlimited</td>
                <td className="py-3 px-4 text-secondary">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Match score accuracy precision</td>
                <td className="py-3 px-4 text-on-surface-variant">Basic overview</td>
                <td className="py-3 px-4 text-primary">Detailed breakdown</td>
                <td className="py-3 px-4">Detailed breakdown</td>
                <td className="py-3 px-4 text-secondary">Detailed breakdown</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Document vault gap analyses</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-emerald-600">✅ Included</td>
                <td className="py-3 px-4 text-emerald-600">✅ Included</td>
                <td className="py-3 px-4 text-secondary">✅ Included</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Document intelligence (AI assistance)</td>
                <td className="py-3 px-4 text-on-surface-variant">Transcripts only</td>
                <td className="py-3 px-4 text-primary">Basic (transcripts, CV, essays)</td>
                <td className="py-3 px-4">Full processing</td>
                <td className="py-3 px-4 text-secondary">Full processing</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Robotic Auto-Apply Engine</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-emerald-600">✅ Fully available</td>
                <td className="py-3 px-4 text-secondary">✅ Fully available</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Essay voice fingerprint learning</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-emerald-600">✅ Enabled</td>
                <td className="py-3 px-4 text-secondary">✅ Enabled</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Human advisory & essay review</td>
                <td className="py-3 px-4 text-on-surface-variant">1 basic / mo</td>
                <td className="py-3 px-4 text-primary">2 structured / mo</td>
                <td className="py-3 px-4">4 full (revised) / mo</td>
                <td className="py-3 px-4 text-secondary">Unlimited full_plus</td>
              </tr>
              <tr>
                <td className="py-3 px-4">1-on-1 strategy sessions</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-red-500">❌ Unavailable</td>
                <td className="py-3 px-4 text-secondary">✅ Available</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Support priority SLA</td>
                <td className="py-3 px-4 text-on-surface-variant">FAQ / Community</td>
                <td className="py-3 px-4 text-primary">Email (48h response)</td>
                <td className="py-3 px-4">Priority Email (24h)</td>
                <td className="py-3 px-4 text-secondary">Dedicated SLA (4h)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Secure Payment Checkout Modal */}
      {showCheckoutModal && selectedPlan && (
        <div id="checkout_gateway_modal" className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl border border-outline-variant/50 shadow-2xl overflow-hidden flex flex-col relative animate-scale-up max-h-[90vh] overflow-y-auto">
            
            {/* Header branding */}
            <div className="p-6 border-b border-outline-variant/30 bg-primary/2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </div>
                <div>
                  <h3 className="font-display font-black text-primary text-base">Secure Payment Gateway</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-widest mt-0.5">PCI-DSS Level 1 Protected</p>
                </div>
              </div>
              <button 
                onClick={() => !isProcessing && setShowCheckoutModal(false)}
                disabled={isProcessing}
                className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center cursor-pointer text-on-surface-variant transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Content Body */}
            {successAnimation ? (
              <div className="p-12 text-center space-y-4 animate-scale-up flex flex-col items-center justify-center min-h-[340px]">
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                  <span className="material-symbols-outlined text-4xl font-bold">check_circle</span>
                </div>
                <h4 className="font-display text-xl font-black text-primary mt-4">Subscription Activated!</h4>
                <p className="text-xs text-on-surface-variant max-w-sm mt-0.5 leading-relaxed">
                  Payment verified successfully. Welcome to the <strong>{selectedPlan.name}</strong> tier! All features are now active.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5 flex-1">
                {/* Selected tier recap */}
                <div className="bg-surface p-4 rounded-2xl border border-outline-variant/40 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-primary uppercase">Academic Subscription</h4>
                    <p className="text-sm font-black text-on-surface">{selectedPlan.name} Tier ({billingCycle})</p>
                    <p className="text-[10px] text-on-surface-variant">Billed immediately on payment confirmation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-on-surface">${getPrice(selectedPlan).usd}</p>
                    <p className="text-xs font-extrabold text-secondary">KES {getPrice(selectedPlan).kes.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wider">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setPaymentMethod('mobile_money'); setCardNumber(''); setCardExpiry(''); setCardCvv(''); setCardName(''); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${
                        paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">smartphone</span>
                      Mobile Money
                      <span className="text-[9px] font-normal">M-Pesa, Airtel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPaymentMethod('card'); setMobilePhone(''); }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-bold ${
                        paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">credit_card</span>
                      Debit / Credit Card
                      <span className="text-[9px] font-normal">Visa, Mastercard</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Money Fields */}
                {paymentMethod === 'mobile_money' && (
                  <div className="space-y-3 animate-sweep">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">smartphone</span>
                        </span>
                        <input
                          type="tel"
                          value={mobilePhone}
                          onChange={e => setMobilePhone(e.target.value)}
                          placeholder="e.g. +254712345678"
                          className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-1">Enter your M-Pesa or Airtel Money number. You will receive a payment prompt on your phone.</p>
                      {mobilePhone && !isMobilePhoneValid && (
                        <p className="text-[10px] text-red-500 mt-1">Please enter a valid phone number (9-15 digits).</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Fields */}
                {paymentMethod === 'card' && (
                  <div className="space-y-3 animate-sweep">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Cardholder Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        placeholder="As shown on your card"
                        className="w-full px-4 py-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Card Number <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">credit_card</span>
                        </span>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                            setCardNumber(v.replace(/(\d{4})/g, '$1 ').trim());
                          }}
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
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
                          className="w-full px-4 py-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">CVV / CVC <span className="text-red-500">*</span></label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-4 py-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                      <span className="material-symbols-outlined text-outline text-sm">lock</span>
                      Your card details are encrypted and never stored on our servers.
                    </div>
                  </div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-3 py-3 animate-sweep">
                    <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                    <span className="text-xs font-bold text-primary">
                      {paymentMethod === 'mobile_money'
                        ? 'Opening Paystack to send payment prompt to your phone...'
                        : 'Opening secure card payment gateway...'}
                    </span>
                  </div>
                )}

                {/* Secure Gateway disclaimer */}
                <div className="flex items-start gap-2 text-[10px] text-on-surface-variant leading-relaxed bg-surface-container-low/50 p-3 rounded-xl">
                  <span className="material-symbols-outlined text-outline text-base shrink-0">security</span>
                  <span>All payments are encrypted with TLS 1.3 and processed through PCI-DSS Level 1 certified infrastructure. Your payment details are never stored on our servers.</span>
                </div>
              </div>
            )}

            {/* Modal actions footer */}
            {!successAnimation && (
              <div className="p-6 border-t border-outline-variant/30 flex gap-4 bg-primary/2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-3 bg-surface border border-outline-variant/60 hover:bg-surface-variant text-on-surface-variant font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-40"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={isProcessing || !isPaymentDetailsComplete}
                  onClick={handleInitiatePayment}
                  className={`flex-1 py-3 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 ${
                    isProcessing || !isPaymentDetailsComplete
                      ? 'bg-primary/40 cursor-not-allowed'
                      : 'bg-primary hover:bg-opacity-95 cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">lock</span>
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
  );
}
