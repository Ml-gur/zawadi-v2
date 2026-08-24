import { Plus } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { FadeUp } from './primitives';

interface Faq {
  q: string;
  a: string;
}

interface FaqSectionProps {
  faqs: Faq[];
  onViewAllFAQs?: () => void;
}

export default function FaqSection({ faqs, onViewAllFAQs }: FaqSectionProps) {
  return (
    <section className="bg-pure-white">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-20 md:py-32">
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>

        <FadeUp>
          <h2 className="text-ed-h1-sm text-off-black-ink mb-8 md:mb-10">Asked often.</h2>
        </FadeUp>

        <FadeUp delay={0.08}>
          <div className="border-t border-ash">
            {faqs.map((faq, idx) => (
              <details key={faq.q} className="group border-b border-ash hover:bg-mist/60 transition-colors">
                <summary className="flex items-center justify-between gap-6 py-6 px-2 -mx-2 rounded-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-mist transition-colors">
                  <span className="text-lg md:text-xl font-medium tracking-[-0.01em] text-off-black-ink group-hover:text-graphite transition-colors">
                    {faq.q}
                  </span>
                  <Plus
                    className="w-5 h-5 shrink-0 text-off-black-ink transition-transform duration-300 group-open:rotate-45"
                    aria-hidden
                  />
                </summary>
                <p className="pb-6 pr-10 text-ed-body text-graphite max-w-[64ch]">{faq.a}</p>
              </details>
            ))}
          </div>
        </FadeUp>

        {onViewAllFAQs && (
          <FadeUp delay={0.15}>
            <button
              onClick={onViewAllFAQs}
              className="group mt-8 inline-flex items-center gap-2 text-base font-medium text-off-black-ink border-b border-off-black-ink pb-1 hover:text-graphite hover:border-graphite transition-colors cursor-pointer"
            >
              All FAQs
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
