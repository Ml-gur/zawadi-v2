import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FadeUp } from './primitives';

const DESTINATIONS = [
  { rate: 2000, label: 'Saudi Arabia / KAUST', region: 'Middle East and Turkey' },
  { rate: 1600, label: 'Canada / US assistantship', region: 'United States and Canada' },
  { rate: 1500, label: 'United Kingdom / Chevening', region: 'United Kingdom and Ireland' },
  { rate: 1200, label: 'Germany / EU public', region: 'Germany, Austria, Switzerland (German-speaking)' },
  { rate: 1000, label: 'China / CSC', region: 'China and East Asia' },
];

const TUITION_WAIVED_PER_YEAR = 8600;
const TESTING_SAVED = 250;

export default function ValueCalculator() {
  const [years, setYears] = useState(2);
  const [destIndex, setDestIndex] = useState(2);
  const [moiStrategy, setMoiStrategy] = useState(true);
  // Live open-grant counts per destination; null while loading or unavailable
  const [counts, setCounts] = useState<Array<number | null>>(DESTINATIONS.map(() => null));
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];

    const run = async () => {
      try {
        const results = await Promise.all(
          DESTINATIONS.map(d =>
            supabase
              .from('scholarships')
              .select('id', { count: 'exact', head: true })
              .eq('published', true)
              .or(`deadline.is.null,deadline.gte.${today}`)
              .eq('funding_type', 'Full')
              .ilike('host_region', d.region)
          )
        );
        if (cancelled) return;
        setCounts(results.map(r => (r.error ? null : r.count ?? 0)));
        setFetchedAt(new Date());
      } catch {
        if (!cancelled) setCounts(DESTINATIONS.map(() => null));
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const tuitionWaived = years * TUITION_WAIVED_PER_YEAR;
    const stipends = years * 12 * DESTINATIONS[destIndex].rate;
    const testingSaved = moiStrategy ? TESTING_SAVED : 0;
    return {
      tuitionWaived,
      stipends,
      testingSaved,
      total: tuitionWaived + stipends + testingSaved,
    };
  }, [years, destIndex, moiStrategy]);

  const liveCount = counts[destIndex];
  const anyLive = counts.some(c => c !== null);
  const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

  return (
    <section id="value-calculator" className="bg-pure-white border-b border-ash">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">

        <FadeUp>
          <div className="bg-parchment border border-ash rounded-ed p-7 md:p-9">
            <h3 className="text-heading tracking-tight text-off-black-ink">Interactive value estimator</h3>

            <div className="mt-7 space-y-7">
              <div>
                <div className="flex items-center justify-between text-ed-body-sm font-medium text-off-black-ink mb-2.5">
                  <label htmlFor="vc-years">Program duration</label>
                  <span className="font-mono text-ed-caption bg-pure-white border border-ash rounded-full px-3 py-1">
                    {years} {years === 1 ? 'year' : 'years'}
                  </span>
                </div>
                <input
                  id="vc-years"
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={years}
                  onChange={e => setYears(Number(e.target.value))}
                  className="w-full accent-off-black-ink cursor-pointer"
                  aria-valuetext={`${years} years`}
                />
                <div className="flex justify-between text-ed-eyebrow uppercase text-graphite mt-1" aria-hidden>
                  <span>1 yr</span><span>4 yrs</span>
                </div>
              </div>

              <div>
                <label htmlFor="vc-destination" className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">
                  Study destination
                </label>
                <select
                  id="vc-destination"
                  value={destIndex}
                  onChange={e => setDestIndex(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
                >
                  {DESTINATIONS.map((d, i) => (
                    <option key={d.label} value={i}>
                      {d.label}
                      {counts[i] !== null ? ` — ${counts[i]} fully funded, open now` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center justify-between gap-4 bg-pure-white border border-ash rounded-lg p-4 cursor-pointer hover:border-graphite transition-colors">
                <span>
                  <span className="block text-ed-body-sm font-medium text-off-black-ink">Use the MOI waiver strategy</span>
                  <span className="block text-ed-caption normal-case tracking-normal text-graphite mt-0.5">
                    Skip the $260 IELTS fee with a Medium-of-Instruction letter
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={moiStrategy}
                  onChange={e => setMoiStrategy(e.target.checked)}
                  className="w-5 h-5 accent-off-black-ink shrink-0 cursor-pointer"
                />
              </label>

              <div className="bg-electric-lime rounded-lg p-6" role="status">
                <p className="text-ed-eyebrow uppercase text-on-lime">Estimated package value</p>
                <p className="text-ed-h1-sm tracking-tight text-off-black-ink mt-1">{usd(totals.total)}</p>
                <dl className="mt-3 pt-3 border-t border-off-black-ink/15 flex flex-wrap gap-x-6 gap-y-1 text-ed-body-sm text-on-lime">
                  <div className="flex gap-1.5">
                    <dt>Stipends:</dt>
                    <dd className="font-medium text-off-black-ink">{usd(totals.stipends)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Tuition waived:</dt>
                    <dd className="font-medium text-off-black-ink">{usd(totals.tuitionWaived)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Testing saved:</dt>
                    <dd className="font-medium text-off-black-ink">{usd(totals.testingSaved)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-ed-caption uppercase tracking-wide text-on-lime">
                  {liveCount !== null
                    ? <>Backed by {liveCount} fully funded listing{liveCount === 1 ? '' : 's'} open in this region · checked {fetchedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                    : anyLive
                      ? 'Live count unavailable for this region'
                      : 'Showing standard published rates'}
                </p>
              </div>
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="flex flex-col items-start">
            <span className="inline-block rounded-full border border-off-black-ink px-4 py-1.5 text-ed-eyebrow uppercase text-off-black-ink">
              Financial impact
            </span>
            <h2 className="mt-7 text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[14ch]">
              What a funded seat is actually worth.
            </h2>
            <p className="mt-6 text-ed-sub font-normal text-graphite max-w-[42ch]">
              Tuition plus living costs for one international Master's degree
              clears $35,000. Every Techsari match also shows which grants waive
              English testing entirely.
            </p>

            <dl className="mt-8 w-full max-w-md space-y-3 text-ed-body-sm">
              <div className="flex items-center justify-between bg-parchment border border-ash rounded-lg px-4 py-3">
                <dt className="text-graphite">Tuition waived by typical awards</dt>
                <dd className="font-medium text-off-black-ink">$18,000 / year</dd>
              </div>
              <div className="flex items-center justify-between bg-parchment border border-ash rounded-lg px-4 py-3">
                <dt className="text-graphite">Monthly living allowance</dt>
                <dd className="font-medium text-off-black-ink">$900 – $2,000</dd>
              </div>
              <div className="flex items-center justify-between bg-parchment border border-ash rounded-lg px-4 py-3">
                <dt className="text-graphite">IELTS fee bypassed via MOI</dt>
                <dd className="font-medium text-off-black-ink bg-electric-lime rounded-full px-2.5 py-0.5">$250 – $300</dd>
              </div>
            </dl>
          </div>
        </FadeUp>

      </div>
    </section>
  );
}
