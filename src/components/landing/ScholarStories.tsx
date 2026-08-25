import { Quote } from 'lucide-react';

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
    initials: 'WN',
    name: 'Wanjiru Njeri',
    route: 'University of Edinburgh · Kenya',
    tag: 'Commonwealth Shared',
    program: 'MSc Data Science',
    quote:
      'I missed a DAAD deadline in 2024 because one email got buried. The tracker put every date in one place and reminded me twice before Edinburgh closed.',
    accent: true,
  },
  {
    initials: 'KM',
    name: 'Kofi Mensah',
    route: 'University of Leeds · Ghana',
    tag: 'Chevening award',
    program: 'MSc Public Policy',
    quote:
      'Four Chevening essays due and nothing written by July. The studio drafted from my actual work history. I rewrote half of it, but it beat a blank page.',
  },
  {
    initials: 'AY',
    name: 'Amina Yusuf',
    route: 'McGill University · Nigeria',
    tag: 'Mastercard Foundation',
    program: 'MSc Epidemiology',
    quote:
      'My transcript and acceptance letters were scattered across WhatsApp and an old laptop. Now everything sits labelled in the vault when a portal asks.',
  },
  {
    initials: 'TM',
    name: 'Tendai Moyo',
    route: 'Kyoto University · Zimbabwe',
    tag: 'MEXT award',
    program: 'MEng Civil Engineering',
    quote:
      'Most directories listed programs I could never enter because of GRE rules buried in the fine print. The eligibility filter hid those before I wasted weekends on them.',
  },
  {
    initials: 'FD',
    name: 'Fatima Diallo',
    route: 'TU Dresden · Senegal',
    tag: 'DAAD EPOS',
    program: 'MSc Hydro Science',
    quote:
      'EPOS courses want two years of work experience and most sites barely say so. Here it was filtered upfront, so I only prepared for what fit me.',
  },
  {
    initials: 'SO',
    name: 'Samuel Ochieng',
    route: 'University of Melbourne · Kenya',
    tag: 'Australia Awards',
    program: 'MSc Agricultural Economics',
    quote:
      'I almost deleted my account during onboarding. Too many questions. Then I added my transcript and the matches got scary-accurate, including the one I am writing this from.',
  },
];

export default function ScholarStories() {
  return (
    <section id="scholar-stories" className="bg-pure-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-ash pb-10 mb-10 md:mb-14">
          <h2 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[16ch]">
            Scholars, placed worldwide.
          </h2>
          <p className="text-ed-body text-graphite max-w-[38ch] md:pb-2">
            Students across Sub-Saharan Africa used matching, deadline
            tracking and essay drafts to reach funded programs in the UK,
            Germany, Japan, Canada and Australia.
          </p>
        </div>
      </div>

      <div className="pb-20 md:pb-32 -mt-10 md:-mt-16 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="marquee-track gap-5 md:gap-6 pr-5 md:pr-6">
          {[...STORIES, ...STORIES].map((story, i) => (
            <figure
              key={`${story.initials}-${i}`}
              aria-hidden={i >= STORIES.length}
              className={`w-[320px] md:w-[400px] shrink-0 rounded-ed p-6 md:p-8 flex flex-col justify-between ${
                story.accent ? 'bg-electric-lime' : 'bg-parchment border border-ash'
              }`}
            >
              <div>
                <span
                  aria-hidden
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-full mb-5 ${
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
                    story.accent ? 'bg-pure-white text-off-black-ink' : 'bg-electric-lime text-off-black-ink'
                  }`}
                >
                  {story.initials}
                </span>
                <span>
                  <span className="block text-ed-body-sm font-medium text-off-black-ink">{story.name}</span>
                  <span className="block text-ed-caption normal-case tracking-normal text-graphite mt-0.5">{story.route}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
