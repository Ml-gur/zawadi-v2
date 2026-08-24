import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, RotateCcw, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FadeUp } from './primitives';

type EnglishStatus = 'ielts' | 'moi' | 'duolingo' | 'none';
type Phase = 'idle' | 'loading' | 'done' | 'error';

interface QuickCheckProps {
  countries: string[];
}

const DEGREE_OPTIONS = [
  { value: 'Masters', label: "Master's degree" },
  { value: 'PhD', label: 'Doctorate / PhD' },
  { value: 'Bachelors', label: 'Undergraduate / Bachelors' },
];

const ENGLISH_OPTIONS: Array<{ value: EnglishStatus; label: string }> = [
  { value: 'moi', label: 'Medium of Instruction (MOI) letter' },
  { value: 'duolingo', label: 'Duolingo English Test ($60)' },
  { value: 'ielts', label: 'IELTS / TOEFL score in hand' },
  { value: 'none', label: 'No test yet — show no-exam grants only' },
];

const selectClass =
  'w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-parchment text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer';

export default function QuickCheck({ countries }: QuickCheckProps) {
  const [country, setCountry] = useState(countries[0] ?? 'Kenya');
  const [degree, setDegree] = useState(DEGREE_OPTIONS[0].value);
  const [english, setEnglish] = useState<EnglishStatus>('moi');
  const [phase, setPhase] = useState<Phase>('idle');
  const [matches, setMatches] = useState(0);

  const runCheck = async () => {
    setPhase('loading');
    const today = new Date().toISOString().split('T')[0];

    // postgrest-js serialises arrays as Postgres literals ({a,b}); jsonb columns need JSON text
    let query = supabase
      .from('scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .contains('countries', JSON.stringify([country]))
      .contains('degree_levels', JSON.stringify([degree]));

    if (english !== 'ielts') query = query.eq('no_ielts', true);

    const { count, error } = await query;

    if (error) {
      setPhase('error');
      return;
    }
    setMatches(count ?? 0);
    setPhase('done');
  };

  return (
    <section id="instant-check" className="bg-parchment border-b border-ash">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        <FadeUp>
          <div className="flex flex-col items-start">
            <span className="inline-block rounded-full border border-off-black-ink px-4 py-1.5 text-ed-eyebrow uppercase text-off-black-ink">
              Instant check
            </span>
            <h2 className="mt-7 text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[14ch]">
              Count your matches before you sign up.
            </h2>
            <p className="mt-6 text-ed-sub font-normal text-graphite max-w-[42ch]">
              Pick your passport, degree and English status. The engine counts
              every open listing you clear today — the same deterministic rules
              the full profile match runs.
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="bg-pure-white border border-ash rounded-ed p-7 md:p-9">
            <form
              onSubmit={e => {
                e.preventDefault();
                runCheck();
              }}
              className="space-y-5"
            >
              <div>
                <label htmlFor="qc-country" className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">
                  Passport country
                </label>
                <div className="relative">
                  <select
                    id="qc-country"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className={`${selectClass} cursor-pointer`}
                  >
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
                </div>
              </div>

              <div>
                <label htmlFor="qc-degree" className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">
                  Target degree level
                </label>
                <div className="relative">
                  <select
                    id="qc-degree"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                    className={`${selectClass} cursor-pointer`}
                  >
                    {DEGREE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
                </div>
              </div>

              <div>
                <label htmlFor="qc-english" className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">
                  English proficiency status
                </label>
                <div className="relative">
                  <select
                    id="qc-english"
                    value={english}
                    onChange={e => setEnglish(e.target.value as EnglishStatus)}
                    className={`${selectClass} cursor-pointer`}
                  >
                    {ENGLISH_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
                </div>
              </div>

              <button
                type="submit"
                disabled={phase === 'loading'}
                className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-electric-lime px-8 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {phase === 'loading' ? (
                  'Counting open grants…'
                ) : (
                  <>
                    Calculate my eligible grants
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                  </>
                )}
              </button>
            </form>

            <div aria-live="polite">
              {phase === 'done' && (
                <div className="animate-sweep mt-6 bg-electric-lime rounded-lg p-6">
                  {matches > 0 ? (
                    <>
                      <p className="text-heading tracking-tight text-off-black-ink flex items-center gap-2">
                        <Zap className="w-5 h-5 shrink-0" strokeWidth={1.75} aria-hidden />
                        {matches} open grant{matches === 1 ? '' : 's'} match you
                      </p>
                      <p className="mt-1.5 text-ed-body-sm text-on-lime">
                        Verified for a {country} passport, {degree} track,
                        {' '}with your {ENGLISH_OPTIONS.find(o => o.value === english)?.label.toLowerCase()}.
                      </p>
                      <Link
                        to="/scholarships/browse"
                        className="group mt-3 inline-flex items-center gap-2 text-base font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors"
                      >
                        See them in the directory
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-heading tracking-tight text-off-black-ink">No open listings for this exact mix yet</p>
                      <p className="mt-1.5 text-ed-body-sm text-on-lime">
                        New grants are verified daily. Widen your options or check back soon — your rules are saved in the directory filters.
                      </p>
                      <Link
                        to="/scholarships/browse"
                        className="group mt-3 inline-flex items-center gap-2 text-base font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors"
                      >
                        Browse all opportunities
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                      </Link>
                    </>
                  )}
                </div>
              )}

              {phase === 'error' && (
                <div className="animate-sweep mt-6 rounded-lg border border-error/30 bg-error/10 p-5">
                  <p className="text-ed-body-sm font-medium text-error">The count could not be loaded.</p>
                  <button
                    onClick={runCheck}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-error px-5 min-h-[44px] text-ed-body-sm font-medium text-error hover:bg-error hover:text-pure-white active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" aria-hidden />
                    Retry count
                  </button>
                </div>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
