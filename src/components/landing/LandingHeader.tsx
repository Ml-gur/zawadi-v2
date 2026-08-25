import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../Logo';

const GUEST_LINKS = [
  { label: 'Browse Scholarships', to: '/scholarships/browse' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'About', to: '/about' },
  { label: 'FAQ', to: '/faq' },
];

const WORKSPACE_TABS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Scholarships', to: '/scholarships' },
  { label: 'Doc Vault', to: '/vault' },
  { label: 'Essay Studio', to: '/essays' },
  { label: 'Profile', to: '/profile' },
  { label: 'Plans', to: '/billing' },
];

interface HeaderUser {
  name?: string;
  email?: string;
  plan?: string;
}

interface LandingHeaderProps {
  onGetStarted?: () => void;
  onLogin?: () => void;
  user?: HeaderUser | null;
}

function isActiveTab(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`) || (to === '/scholarships' && pathname.startsWith('/scholarships'));
}

export default function LandingHeader({ onGetStarted, onLogin, user }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const authed = Boolean(user);
  const displayName = user?.name || user?.email?.split('@')[0] || 'Scholar';
  const planLabel = user?.plan
    ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
    : 'Explorer';

  // Logged-in users keep the workspace nav; guests get the public pages.
  const links = authed ? WORKSPACE_TABS : GUEST_LINKS;

  const signOut = () => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('Techsari-signout'));
  };

  return (
    <header className="sticky top-0 z-50 bg-pure-white/95 backdrop-blur-md border-b border-ash">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <Link
          to={authed ? '/dashboard' : '/'}
          className="flex items-center gap-2.5 shrink-0 group hover:text-graphite transition-colors"
          onClick={() => setOpen(false)}
          aria-label={authed ? 'Techsari — go to dashboard' : 'Techsari — home'}
        >
          <span className="transition-transform duration-300 group-hover:-rotate-6">
            <Logo size={30} tone="dark" />
          </span>
          <span className="text-xl font-medium tracking-[-0.02em] text-off-black-ink transition-colors duration-200 group-hover:text-graphite">Techsari</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-6 xl:gap-7">
          {links.map(l => {
            const active = isActiveTab(pathname, l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? 'page' : undefined}
                className={`text-ed-body-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  active
                    ? 'text-off-black-ink border-electric-lime hover:text-graphite'
                    : 'text-graphite border-transparent hover:text-off-black-ink'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {authed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-electric-lime inline-flex items-center justify-center text-[11px] font-medium text-off-black-ink shrink-0" aria-hidden>
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="leading-tight min-w-0">
                  <span className="block text-ed-body-sm font-medium text-off-black-ink truncate max-w-[140px]">{displayName}</span>
                  <span className="block text-ed-eyebrow uppercase text-graphite">{planLabel} plan</span>
                </span>
              </div>
              <button
                onClick={signOut}
                className="inline-flex items-center rounded-full border border-ash px-4 min-h-[40px] text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-off-black-ink active:scale-[0.98] transition-all cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="text-ed-body-sm font-medium text-off-black-ink hover:text-graphite transition-colors cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={onGetStarted}
                className="btn-shine inline-flex items-center justify-center rounded-full bg-electric-lime px-5 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
              >
                Find my matches
              </button>
            </>
          )}
        </div>

        <button
          className="lg:hidden icon-btn inline-flex items-center justify-center text-off-black-ink hover:text-graphite transition-colors cursor-pointer"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="lg:hidden border-t border-ash bg-pure-white px-4 py-4 flex flex-col animate-sweep max-h-[80dvh] overflow-y-auto"
        >
          {(authed ? (
            <>
              <div className="flex items-center gap-3 px-1 pb-4 mb-2 border-b border-ash">
                <span className="w-9 h-9 rounded-full bg-electric-lime inline-flex items-center justify-center text-xs font-medium text-off-black-ink" aria-hidden>
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="leading-tight">
                  <span className="block text-ed-body font-medium text-off-black-ink truncate max-w-[200px]">{displayName}</span>
                  <span className="block text-ed-eyebrow uppercase text-graphite">{planLabel} plan</span>
                </span>
              </div>
              {WORKSPACE_TABS.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  aria-current={isActiveTab(pathname, l.to) ? 'page' : undefined}
                  className={`py-3 text-base font-medium border-b border-ash/60 last:border-0 transition-colors ${
                    isActiveTab(pathname, l.to) ? 'text-off-black-ink' : 'text-graphite hover:text-off-black-ink'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="mt-4 inline-flex items-center justify-center min-h-[44px] rounded-full border border-ash text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-off-black-ink transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {GUEST_LINKS.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base font-medium text-off-black-ink border-b border-ash/60 last:border-0 hover:text-graphite transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => { setOpen(false); onLogin?.(); }}
                  className="flex-1 inline-flex items-center justify-center min-h-[44px] rounded-full border border-ash text-ed-body-sm font-medium text-off-black-ink hover:border-off-black-ink transition-colors cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { setOpen(false); onGetStarted?.(); }}
                  className="flex-1 inline-flex items-center justify-center min-h-[44px] rounded-full bg-electric-lime text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
                >
                  Find my matches
                </button>
              </div>
            </>
          ))}
        </nav>
      )}
    </header>
  );
}
