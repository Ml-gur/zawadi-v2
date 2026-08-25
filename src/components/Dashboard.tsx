import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bolt,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  Clock,
  Network,
  NotebookPen,
} from 'lucide-react';
import { SEO } from './SEO';
import { Scholarship, ApplicationTracker } from '../types';
import { flagFor } from '../lib/flags';

interface DashboardProps {
  user: any;
  scholarships: Scholarship[];
  applications: ApplicationTracker[];
  documents: any[];
  essays: any[];
  onNavigateToTab: (tab: string) => void;
  onViewScholarship: (schol: Scholarship) => void;
  onTriggerQuickDraft: () => void;
}

export default function Dashboard({
  user,
  scholarships,
  applications,
  documents,
  onNavigateToTab,
  onViewScholarship,
}: DashboardProps) {
  const navigate = useNavigate();
  const appliedCount = applications.filter(a => a.status === 'Applied').length;
  const draftingCount = applications.filter(a => a.status === 'Drafting' || a.status === 'Preparing Documents' || a.status === 'Essay Drafting').length;
  const savedCount = applications.filter(a => a.status === 'Saved').length;

  // Matching only runs when the engine has real criteria to score against.
  const missingProfileFields = [
    !user?.country && 'Nationality',
    !user?.degree_level && 'Degree level',
    !user?.field_of_study && 'Field of study',
    !user?.gpa && 'GPA',
    !user?.date_of_birth && 'Date of birth',
  ].filter(Boolean) as string[];
  const profileComplete = missingProfileFields.length === 0;

  const docsPending = (documents || []).filter(d => !d.analysis_status || d.analysis_status === 'pending');
  const docsReady = (documents || []).filter(d => d.analysis_status === 'completed');

  const now = new Date();
  const urgentList = scholarships
    .filter(s => s.published && s.deadline && !s.deadline.toLowerCase().includes('varies') && !s.deadline.toLowerCase().includes('annual'))
    .filter(s => !s.opens_at || Date.parse(s.opens_at) <= now.getTime())
    .map(s => ({ ...s, _daysLeft: Math.ceil((new Date(s.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) }))
    .filter(s => s._daysLeft > 0 && s._daysLeft <= 30)
    .sort((a, b) => a._daysLeft - b._daysLeft);
  const urgentCount = urgentList.length;

  const strongMatchCount = scholarships.filter(s => (s.match?.score || 0) >= 80).length;

  const matchedScholarships = scholarships
    .filter(s => s.published)
    .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
    .slice(0, 3);

  const firstName = String(user?.name || user?.email || 'there').split(' ')[0];

  return (
    <div className="animate-sweep space-y-16 md:space-y-20 text-off-black-ink">
      <SEO title="Dashboard — Your Matches | Techsari" description="Your personalised scholarship workspace: match scores, critical deadlines and application pipeline." path="/dashboard" noindex />


      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-ed-eyebrow uppercase tracking-[1px] text-graphite mb-2 block">
            Welcome back, {firstName}
          </span>
          <h1 className="text-3xl md:text-3xl md:text-ed-h1-sm font-medium tracking-tight text-off-black-ink">
            Your AI Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-electric-lime text-off-black-ink text-ed-eyebrow uppercase px-4 py-2 rounded-full inline-flex items-center gap-1.5">
            <Bolt className="w-4 h-4 text-off-black-ink" aria-hidden /> READY TO APPLY, {firstName.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Stats Grid (Bento Style) */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5 md:gap-6 relative">

        {/* AI Match Center Header (Full Width) */}
        <div
          onClick={() => onNavigateToTab('scholarships')}
          className="col-span-1 md:col-span-12 bg-parchment border border-ash rounded-ed p-8 md:p-10 flex flex-col sm:flex-row justify-between items-center gap-6 relative cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <Network className="text-off-black-ink w-8 h-8 shrink-0" strokeWidth={1.75} aria-hidden />
            <div>
              <h2 className="text-xl font-medium text-off-black-ink">AI Match Center</h2>
              <p className="text-sm text-graphite">
                {!profileComplete
                  ? 'Matching starts once your profile has nationality, degree, field and GPA.'
                  : strongMatchCount > 0
                    ? `${strongMatchCount} high-eligibility matches found`
                    : scholarships.length > 0
                      ? `${scholarships.filter(s => s.published).length} live opportunities ranked for you`
                      : 'Live opportunities loading…'}
              </p>
            </div>
          </div>
          {!profileComplete ? (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigateToTab('profile'); }}
              className="inline-flex items-center justify-center rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all shrink-0"
            >
              Finish profile ({missingProfileFields.length} left)
            </button>
          ) : (
            <ArrowRight className="w-5 h-5 text-graphite group-hover:text-off-black-ink transition-transform duration-300 group-hover:translate-x-1.5 hidden sm:block" />
          )}
        </div>

        {/* Setup completion panel — shown until profile + documents are genuinely ready */}
        {(!profileComplete || docsPending.length > 0) && (
          <div className="col-span-1 md:col-span-12 bg-pure-white border border-ash rounded-ed p-8 md:p-10">
            <h3 className="text-ed-sub text-off-black-ink tracking-tight">
              {profileComplete ? 'Your documents are still being processed' : 'Two steps before matching can run'}
            </h3>
            <p className="mt-2 text-ed-body-sm text-graphite max-w-[64ch]">
              {profileComplete
                ? 'Percentages appear once your documents are analyzed — the engine reads your GPA, research and experience straight from them.'
                : 'The engine scores you against each scholarship\u2019s real criteria: nationality, degree, field and GPA. Without them, any percentage would be a guess — and we don\u2019t guess.'}
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {!profileComplete && (
                <div className="border border-ash rounded-lg p-5">
                  <p className="text-ed-caption uppercase text-graphite">Step 1 · Profile</p>
                  <p className="mt-2 text-ed-body-sm text-off-black-ink font-medium">
                    Missing: {missingProfileFields.join(', ')}
                  </p>
                  <button
                    onClick={() => onNavigateToTab('profile')}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Complete profile
                  </button>
                </div>
              )}
              <div className={`border rounded-lg p-5 ${docsPending.length > 0 ? 'border-electric-lime' : 'border-ash'}`}>
                <p className="text-ed-caption uppercase text-graphite">{profileComplete ? 'Document status' : 'Step 2 · Documents'}</p>
                <p className="mt-2 text-ed-body-sm text-off-black-ink font-medium">
                  {documents.length === 0
                    ? 'No documents uploaded yet — matching uses your transcripts and CV to verify GPA and experience.'
                    : `${docsReady.length} analyzed · ${docsPending.length} pending`}
                </p>
                <button
                  onClick={() => onNavigateToTab('vault')}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-off-black-ink px-6 min-h-[44px] text-ed-body-sm font-medium text-pure-white hover:bg-black active:scale-[0.98] transition-all cursor-pointer"
                >
                  {documents.length === 0 ? 'Open Doc Vault' : 'Review pending documents'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applied Card */}
        <div
          onClick={() => navigate('/applications?stage=Applied')}
          className="col-span-1 md:col-span-3 bg-electric-lime border border-ash rounded-ed p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="flex justify-between items-start">
            <CheckCircle2 className="text-off-black-ink w-7 h-7" strokeWidth={1.5} aria-hidden />
            <ArrowRight className="text-off-black-ink/60 opacity-0 group-hover:opacity-100 transition-all w-5 h-5" aria-hidden />
          </div>
          <div className="mt-2">
            <div className="text-3xl md:text-ed-h1-sm font-medium tracking-tight text-off-black-ink mb-0 leading-none">{appliedCount}</div>
            <p className="text-ed-caption uppercase tracking-wider text-graphite mt-1">Applied Scholarships</p>
          </div>
        </div>

        {/* Drafting Card */}
        <div
          onClick={() => navigate('/applications?stage=Drafting')}
          className="col-span-1 md:col-span-3 bg-parchment border border-ash rounded-ed p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="flex justify-between items-start">
            <NotebookPen className="text-graphite w-7 h-7" strokeWidth={1.5} aria-hidden />
            <ArrowRight className="text-graphite opacity-0 group-hover:opacity-100 transition-all w-5 h-5" aria-hidden />
          </div>
          <div className="mt-2">
            <div className="text-3xl md:text-ed-h1-sm font-medium tracking-tight text-off-black-ink mb-0 leading-none">{draftingCount}</div>
            <p className="text-ed-caption uppercase tracking-wider text-graphite mt-1">Drafting Applications</p>
          </div>
        </div>

        {/* Saved Card */}
        <div
          onClick={() => navigate('/applications?stage=Saved')}
          className="col-span-1 md:col-span-3 bg-pure-white border border-ash rounded-ed p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px] cursor-pointer group transition-transform duration-300 hover:-translate-y-1"
        >
          <div className="flex justify-between items-start">
            <Bookmark className="text-graphite w-7 h-7" strokeWidth={1.5} aria-hidden />
            <ArrowRight className="text-graphite opacity-0 group-hover:opacity-100 transition-all w-5 h-5" aria-hidden />
          </div>
          <div className="mt-2">
            <div className="text-3xl md:text-ed-h1-sm font-medium tracking-tight text-off-black-ink mb-0 leading-none">{savedCount}</div>
            <p className="text-ed-caption uppercase tracking-wider text-graphite mt-1">Saved Opportunities</p>
          </div>
        </div>

        {/* Deadlines Card (Inverted Charcoal Style) */}
        <div
          onClick={() => navigate('/scholarships?sort=deadline')}
          className="col-span-1 md:col-span-3 bg-deep-charcoal rounded-ed p-4 md:p-6 flex flex-col justify-between min-h-[120px] md:min-h-[140px] text-pure-white cursor-pointer group transition-all duration-300 hover:bg-off-black-ink hover:-translate-y-1"
        >
          <div className="flex justify-between items-start">
            <CalendarClock className="text-electric-lime w-7 h-7" strokeWidth={1.5} aria-hidden />
            <ArrowRight className="text-smoke opacity-0 group-hover:opacity-100 transition-all w-5 h-5" aria-hidden />
          </div>
          <div className="mt-2">
            <div className="text-3xl md:text-ed-h1-sm font-medium tracking-tight text-electric-lime mb-0 leading-none">{urgentCount}</div>
            <p className="text-ed-caption uppercase tracking-wider text-smoke mt-1">Critical Deadlines</p>
          </div>
        </div>

      </div>

      {/* Critical Deadlines Section */}
      <section className="mb-10 md:mb-20">
        <div className="flex justify-between items-end border-b border-ash pb-4 mb-5 md:mb-10">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-medium text-off-black-ink">Critical Deadlines</h3>
            {urgentCount > 0 && (
              <span className="bg-error text-pure-white text-ed-eyebrow uppercase font-medium px-3 py-1 rounded-full">URGENT</span>
            )}
          </div>
          <Link to="/scholarships?sort=deadline" className="text-base font-medium text-graphite border-b border-graphite hover:text-off-black-ink hover:border-off-black-ink transition-colors">
            View All
          </Link>
        </div>

        {urgentList.length === 0 ? (
          <div className="rounded-ed border border-ash bg-pure-white py-14 px-6 text-center">
            <p className="text-xl font-medium text-off-black-ink">Nothing closing right now</p>
            <p className="mt-2 text-sm text-graphite">Deadlines inside the next 30 days will surface here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {urgentList.slice(0, 3).map((s) => {
              const score = s.match?.score ?? null;
              return (
                <div
                  key={s.id}
                  onClick={() => onViewScholarship(s as unknown as Scholarship)}
                  className="bg-pure-white border border-ash rounded-ed p-8 md:p-10 group cursor-pointer flex flex-col justify-between h-full relative transition-transform duration-300 hover:-translate-y-1"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-lg leading-none">{flagFor(s as unknown as Scholarship)}</span>
                        {score !== null ? (
                          <span className="bg-electric-lime text-off-black-ink text-ed-eyebrow uppercase font-medium px-4 py-2 rounded-full">
                            {score >= 90 ? `${score}% ELIGIBLE` : `${score}% MATCH`}
                          </span>
                        ) : (
                          <span className="border border-ash text-graphite text-ed-eyebrow uppercase font-medium px-4 py-2 rounded-full">
                            New listing
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-graphite group-hover:text-off-black-ink transition-colors" aria-hidden />
                    </div>
                    <h4 className="text-xl font-medium text-off-black-ink mb-2 pr-8">{s.name}</h4>
                    {s.description && (
                      <p className="text-sm text-graphite mb-6 line-clamp-3">
                        {String(s.description).slice(0, 150)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-graphite text-xs font-medium pt-4 border-t border-ash">
                    <Clock className="w-4 h-4 text-off-black-ink" aria-hidden />
                    {s._daysLeft === 1 ? 'Closing in 24 hours' : `Closing in ${s._daysLeft} days`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Opportunities Section */}
      <section className="mb-10 md:mb-20">
        <div className="flex justify-between items-end border-b border-ash pb-4 mb-5 md:mb-10">
          <h3 className="text-2xl font-medium text-off-black-ink">Recent Opportunities</h3>
          <Link to="/scholarships/browse" className="text-base font-medium text-graphite border-b border-graphite hover:text-off-black-ink hover:border-off-black-ink transition-colors">
            View All
          </Link>
        </div>

        {matchedScholarships.length === 0 ? (
          <div className="rounded-ed border border-ash bg-pure-white py-14 px-6 text-center">
            <p className="text-xl font-medium text-off-black-ink">Complete your profile to unlock matches</p>
            <p className="mt-2 text-sm text-graphite">Personalised rankings appear once your academic details are confirmed.</p>
            <button
              onClick={() => onNavigateToTab('profile')}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-electric-lime px-8 min-h-[48px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
            >
              Complete Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {matchedScholarships.map((s) => {
              const score = s.match?.score ?? null;
              return (
                <div
                  key={s.id}
                  onClick={() => onViewScholarship(s)}
                  className="bg-pure-white border border-ash rounded-ed p-6 group cursor-pointer flex flex-col justify-between h-full relative transition-transform duration-300 hover:-translate-y-1"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-lg leading-none">{flagFor(s)}</span>
                        {score !== null ? (
                          <span className="bg-electric-lime text-off-black-ink text-ed-eyebrow uppercase font-medium px-4 py-2 rounded-full">
                            {score >= 90 ? `${score}% ELIGIBLE` : `${score}% MATCH`}
                          </span>
                        ) : (
                          <span className="border border-ash text-graphite text-ed-eyebrow uppercase font-medium px-4 py-2 rounded-full">
                            New listing
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-graphite group-hover:text-off-black-ink transition-colors" aria-hidden />
                    </div>
                    <h4 className="text-xl font-medium text-off-black-ink mb-2 pr-8">{s.name}</h4>
                    <p className="text-xs font-medium text-off-black-ink mb-3">
                      {[s.provider, s.host_institution].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-sm text-graphite mb-6 line-clamp-3">
                      {topReasonOf(s)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-graphite text-xs font-medium pt-4 border-t border-ash">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-off-black-ink" aria-hidden />
                      {deadlineLabel(s.deadline)}
                    </span>
                    <span className="text-off-black-ink group-hover:underline flex items-center gap-1">
                      Review <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

function topReasonOf(s: Scholarship): string {
  if (s.match?.reasons?.length) return String(s.match.reasons[0]);
  if (s.description) return String(s.description).slice(0, 160);
  const funding = s.funding_type === 'Full' ? 'Full funding' : 'Partial funding';
  const places = (s.countries || []).slice(0, 2).join(', ') || 'African Students';
  return `${funding} · Available for ${places}`;
}

function deadlineLabel(deadline?: string): string {
  if (!deadline) return 'Check website';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return deadline;
  return `Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}
