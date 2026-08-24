import { Link } from 'react-router-dom';

const FOOTER_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Contact', to: '/contact' },
  { label: 'Browse Scholarships', to: '/scholarships/browse' },
];

export default function LandingFooter() {
  return (
    <footer className="bg-off-black-ink text-pure-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <span className="text-xl font-medium tracking-[-0.02em]">Techsari</span>
          <span className="text-ed-body-sm text-smoke">
            © {new Date().getFullYear()} Techsari — scholarship matching for African students.
          </span>
        </div>

        <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {FOOTER_LINKS.map(l => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="text-ed-body-sm text-pure-white underline decoration-smoke/50 underline-offset-4 hover:text-electric-lime hover:decoration-electric-lime transition-colors"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
