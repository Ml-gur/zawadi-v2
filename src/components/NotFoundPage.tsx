import { Link } from 'react-router-dom';
import { ArrowRight, Compass, SearchX } from 'lucide-react';
import { SEO } from './SEO';

interface NotFoundPageProps {
  onBack?: () => void;
}

export default function NotFoundPage({ onBack }: NotFoundPageProps) {
  return (
    <div className="min-h-[80dvh] bg-pure-white text-off-black-ink flex items-center justify-center px-4 sm:px-6 py-20">
      <SEO
        title="Page Not Found — Techsari"
        description="The page you are looking for does not exist. Return to the Techsari homepage to find scholarships for African students."
        path="/404"
      />
      <div className="w-full max-w-lg bg-parchment border border-ash rounded-ed p-8 md:p-12 text-center animate-sweep">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-electric-lime mb-6" aria-hidden>
          <SearchX className="w-5 h-5 text-off-black-ink" strokeWidth={1.75} />
        </span>

        <p className="text-ed-caption uppercase text-graphite">Error 404</p>
        <h1 className="mt-2 text-ed-h1-sm text-off-black-ink tracking-tight">
          This page isn't on our map.
        </h1>
        <p className="mt-3 text-ed-body text-graphite max-w-[42ch] mx-auto">
          The link may be broken or the page moved. The scholarship directory,
          however, is very much alive — new verified grants land daily.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-electric-lime px-7 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4" aria-hidden />
              Go to homepage
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-electric-lime px-7 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all"
            >
              <Compass className="w-4 h-4" aria-hidden />
              Go to homepage
            </Link>
          )}
          <Link
            to="/scholarships/browse"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-off-black-ink px-6 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white active:scale-[0.98] transition-all"
          >
            Browse scholarships
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
