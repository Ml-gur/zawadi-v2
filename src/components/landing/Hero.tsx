import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeUp, CountUp } from './primitives';
import ProductMockup from './ProductMockup';

interface HeroProps {
  onGetStarted: () => void;
  onLogin: () => void;
  countriesCount: number;
}

export default function Hero({ onGetStarted, onLogin, countriesCount }: HeroProps) {
  return (
    <section className="bg-parchment border-b border-ash overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-28 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div className="flex flex-col items-start">
          <FadeUp>
            <span className="inline-block rounded-full border border-off-black-ink px-4 py-1.5 text-ed-eyebrow uppercase text-off-black-ink">
              {countriesCount || 54} African countries · Official sources · Eligibility-first matching
            </span>
          </FadeUp>

          <FadeUp delay={0.08}>
            <h1 className="mt-7 text-ed-hero-sm md:text-ed-hero text-off-black-ink max-w-[14ch]">
              Find the scholarships you can actually apply for.
            </h1>
          </FadeUp>

          <FadeUp delay={0.16}>
            <p className="mt-6 text-ed-sub font-normal text-graphite max-w-[48ch]">
              One profile. Thousands of eligibility rules. Zawadi checks your
              nationality, degree, field, grades, experience and English
              requirements against verified scholarship opportunities — so you
              spend less time searching and more time applying.
            </p>
          </FadeUp>

          <FadeUp delay={0.24}>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2 rounded-full bg-electric-lime px-8 min-h-[54px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
              >
                Find my scholarships
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <Link
                to="/scholarships/browse"
                className="inline-flex items-center text-base font-medium text-off-black-ink border-b border-off-black-ink pb-1 hover:text-graphite hover:border-graphite transition-colors"
              >
                Browse all scholarships
              </Link>
            </div>
          </FadeUp>

          <FadeUp delay={0.32}>
            <button
              onClick={onLogin}
              className="mt-8 text-sm text-graphite underline underline-offset-4 decoration-ash hover:text-off-black-ink hover:decoration-graphite transition-colors cursor-pointer"
            >
              Already have an account? Sign in
            </button>
          </FadeUp>

          <FadeUp delay={0.4}>
            <dl className="mt-10 pt-6 border-t border-ash grid grid-cols-3 gap-4 max-w-md">
              <div>
                <dd className="text-2xl sm:text-3xl font-medium tracking-tight text-off-black-ink">
                  <CountUp to={countriesCount || 54} />
                </dd>
                <dt className="text-xs text-graphite mt-0.5">African students covered</dt>
              </div>
              <div>
                <dd className="text-2xl sm:text-3xl font-medium tracking-tight text-off-black-ink">
                  <CountUp to={42} prefix="$" suffix="M+" />
                </dd>
                <dt className="text-xs text-graphite mt-0.5">Funding mapped</dt>
              </div>
              <div>
                <dd className="text-2xl sm:text-3xl font-medium tracking-tight text-off-black-ink">100%</dd>
                <dt className="text-xs text-graphite mt-0.5">Official-source-first verification</dt>
              </div>
            </dl>
          </FadeUp>
        </div>

        <FadeUp delay={0.2}>
          <ProductMockup />
        </FadeUp>
      </div>
    </section>
  );
}
