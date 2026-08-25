import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeUp } from './primitives';

interface LimeBreakoutProps {
  onGetStarted: () => void;
}

export default function LimeBreakout({ onGetStarted }: LimeBreakoutProps) {
  return (
    <section className="bg-pure-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-28">
        <FadeUp>
          <div className="bg-electric-lime border border-off-black-ink/20 rounded-ed p-10 sm:p-16 md:p-20 flex flex-col items-center text-center">
            <span className="text-ed-eyebrow uppercase text-on-lime">Start your application cycle</span>

            <h2 className="mt-4 text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[22ch]">
              Your potential. Funded.
            </h2>

            <p className="mt-5 text-ed-sub font-normal text-on-lime max-w-[46ch]">
              The right scholarship is not the one that looks easiest. It is
              the one whose requirements you actually meet. Find yours with
              Zawadi.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-3 rounded-full bg-off-black-ink px-8 min-h-[56px] text-base font-medium text-pure-white hover:bg-black active:scale-[0.98] transition-all cursor-pointer"
              >
                Create my free profile
                <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
              <Link
                to="/scholarships/browse"
                className="inline-flex items-center gap-2 rounded-full bg-pure-white px-6 min-h-[56px] text-base font-medium text-off-black-ink border border-off-black-ink hover:bg-parchment active:scale-[0.98] transition-all"
              >
                Browse the directory first
              </Link>
            </div>

            <p className="mt-7 text-ed-caption uppercase tracking-wide text-on-lime">
              No application fees · Every listing linked to its official source · Your data never sold
            </p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
