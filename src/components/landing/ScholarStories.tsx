import { Quote } from 'lucide-react';
import { FadeUp } from './primitives';

interface Story {
  initials: string;
  name: string;
  route: string;
  tag: string;
  program: string;
  quote: string;
  accent?: boolean;
}

const STORIES: Story[] = [
  {
    initials: 'AK',
    name: 'Amina Kouyaté',
    route: 'Mali → Germany · Governance Policy',
    tag: 'Full scholarship',
    program: 'MSc Germany',
    quote:
      'I wasted over $200 applying to programs that quietly excluded my country\u2019s degree structure. Techsari filtered twelve where I was fully eligible — I am now at Magdeburg on a DAAD Helmut-Schmidt fellowship.',
    accent: true,
  },
  {
    initials: 'CN',
    name: 'Chidi Nnamdi',
    route: 'Nigeria → China · Tsinghua CSC Fellow',
    tag: 'MOI waiver',
    program: 'Tsinghua CSC',
    quote:
      'The Medium-of-Instruction filter saved me $280 in IELTS fees. My university letter was accepted without issue, and the CSC grant covers full tuition, campus housing and a monthly stipend.',
  },
  {
    initials: 'FM',
    name: 'Faith Muthoni',
    route: 'Kenya → UK · Chevening Scholar',
    tag: 'Chevening award',
    program: 'King\u2019s College London',
    quote:
      'The essay studio helped me structure my leadership essays around real community work in Nairobi. The mentor review feedback was the game-changer.',
  },
];

export default function ScholarStories() {
  return (
    <section id="scholar-stories" className="bg-pure-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32">
        <FadeUp>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-ash pb-10 mb-10 md:mb-14">
            <h2 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[16ch]">
              Scholars, placed worldwide.
            </h2>
            <p className="text-ed-body text-graphite max-w-[38ch] md:pb-2">
              Students across Sub-Saharan Africa used deterministic matching to
              reach funding in Germany, China and the UK.
            </p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {STORIES.map((story, i) => (
            <FadeUp key={story.initials} delay={i * 0.08}>
              <figure
                className={`group h-full rounded-ed p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 ${
                  story.accent ? 'bg-electric-lime' : 'bg-parchment border border-ash'
                }`}
              >
                <div>
                  <span
                    aria-hidden
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full mb-5 transition-transform duration-500 group-hover:-rotate-6 ${
                      story.accent ? 'bg-off-black-ink text-electric-lime' : 'bg-electric-lime text-off-black-ink'
                    }`}
                  >
                    <Quote className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <div className="flex items-center gap-2 flex-wrap mb-6">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-ed-eyebrow uppercase font-medium ${
                        story.accent
                          ? 'bg-off-black-ink text-electric-lime'
                          : 'bg-electric-lime text-off-black-ink'
                      }`}
                    >
                      {story.tag}
                    </span>
                    <span className="text-ed-body-sm text-graphite">{story.program}</span>
                  </div>

                  <blockquote className={`text-ed-body leading-relaxed ${story.accent ? 'text-off-black-ink' : 'text-on-surface'}`}>
                    “{story.quote}”
                  </blockquote>
                </div>

                <figcaption
                  className={`mt-8 pt-6 border-t flex items-center gap-3 ${
                    story.accent ? 'border-off-black-ink/20' : 'border-ash'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`w-10 h-10 rounded-full inline-flex items-center justify-center text-xs font-medium shrink-0 ${
                      story.accent
                        ? 'bg-pure-white text-off-black-ink'
                        : 'bg-electric-lime text-off-black-ink'
                    }`}
                  >
                    {story.initials}
                  </span>
                  <span>
                    <span className="relative block w-fit text-ed-body-sm font-medium text-off-black-ink after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-electric-lime after:transition-transform after:duration-300 group-hover:after:scale-x-100">
                      {story.name}
                    </span>
                    <span className="block text-ed-caption normal-case tracking-normal text-graphite mt-0.5">{story.route}</span>
                  </span>
                </figcaption>
              </figure>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
