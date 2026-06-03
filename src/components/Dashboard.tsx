import React from 'react';
import { Scholarship, ApplicationTracker } from '../types';

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
  essays,
  onNavigateToTab,
  onViewScholarship,
  onTriggerQuickDraft
}: DashboardProps) {
  // Derive Statistics
  const totalApps = applications.length;
  const appliedCount = applications.filter(a => a.status === 'Applied').length;
  const draftingCount = applications.filter(a => a.status === 'Drafting' || a.status === 'Preparing Documents' || a.status === 'Essay Drafting').length;
  const savedCount = applications.filter(a => a.status === 'Saved').length;
  const awardedCount = applications.filter(a => a.status === 'Awarded').length;

  // Compute urgent deadlines (within 30 days) from actual scholarship data
  const now = new Date();
  const urgentCount = scholarships.filter(s => {
    if (!s.deadline || s.deadline.toLowerCase().includes('varies') || s.deadline.toLowerCase().includes('annual')) return false;
    const d = new Date(s.deadline);
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 30;
  }).length;

  // Compute strong matches from actual match scores >= 80
  const strongMatchCount = scholarships.filter(s => (s.match?.score || 0) >= 80).length;

  // Let's filter top 3 matching scholarships based on match score
  const matchedScholarships = scholarships
    .filter(s => s.published && (s.match?.score || 0) > 0)
    .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
    .slice(0, 3);

  // Profile Strength Calculator — only counts fields the student explicitly confirmed
  const confirmed = user.confirmed_fields || [];

  const mvspFields = [
    { key: 'country', label: 'Nationality / Country' },
    { key: 'date_of_birth', label: 'Date of birth' },
    { key: 'degree_level', label: 'Current degree level' },
    { key: 'field_of_study', label: 'Desired field of study' },
    { key: 'gpa', label: 'Current GPA' },
  ];
  const mvspMissing = mvspFields.filter(f => !confirmed.includes(f.key));

  const enrichFields = [
    { key: 'destination_openness', label: 'Study destination preference' },
    { key: 'english_test_type', label: 'English proficiency test' },
    { key: 'has_research', label: 'Research experience' },
    { key: 'has_leadership', label: 'Leadership experience' },
  ];
  const enrichMissing = enrichFields.filter(f => !confirmed.includes(f.key));

  let profileStrength = 0;
  const presentMvsp = mvspFields.filter(f => confirmed.includes(f.key)).length;
  profileStrength = presentMvsp * 12;
  if (documents.length >= 2) profileStrength += 15;

  return (
    <div className="space-y-8 animate-sweep">
      
      {/* Top Banner Quick CTAs */}
      <div className="flex flex-wrap gap-4 bg-surface-container-lowest/80 backdrop-blur-md p-5 rounded-2xl border border-outline-variant/40 shadow-sm">
        <button 
          onClick={() => onNavigateToTab('vault')}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-container transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">upload_file</span>
          Upload Document
        </button>
        <button 
          onClick={onTriggerQuickDraft}
          className="flex items-center gap-2 px-5 py-3 bg-secondary text-on-secondary rounded-xl font-bold hover:bg-opacity-90 transition-all shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          Generate Essay
        </button>
        <button 
          onClick={() => onNavigateToTab('scholarships')}
          className="flex items-center gap-2 px-5 py-3 bg-surface-container-lowest text-primary border border-outline-variant/60 rounded-xl font-bold hover:bg-surface-container-low transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">search</span>
          Find Scholarships
        </button>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div onClick={() => onNavigateToTab('tracker')} className="premium-glass p-4 rounded-xl border-l-4 border-primary cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Total Apps</p>
          <p className="text-2xl font-extrabold text-primary">{totalApps}</p>
        </div>
        <div onClick={() => onNavigateToTab('tracker')} className="premium-glass p-4 rounded-xl border-l-4 border-status-success cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Applied</p>
          <p className="text-2xl font-extrabold text-primary">{appliedCount}</p>
        </div>
        <div onClick={() => onNavigateToTab('tracker')} className="premium-glass p-4 rounded-xl border-l-4 border-status-info cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Drafting</p>
          <p className="text-2xl font-extrabold text-primary">{draftingCount}</p>
        </div>
        <div onClick={() => onNavigateToTab('tracker')} className="premium-glass p-4 rounded-xl border-l-4 border-status-urgent cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Urgent (&lt;30d)</p>
          <p className="text-2xl font-extrabold text-primary">{urgentCount}</p>
        </div>
        <div onClick={() => onNavigateToTab('scholarships')} className="premium-glass p-4 rounded-xl border-l-4 border-secondary cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Strong Matches</p>
          <p className="text-2xl font-extrabold text-primary">{strongMatchCount}</p>
        </div>
      </div>

      {/* Dynamic Academic Subscription Status Row */}
      <div className="premium-glass p-5 rounded-2xl border border-outline-variant/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">
            {user?.plan === 'explorer' ? 'explore' : user?.plan === 'institutional' ? 'business' : 'stars'}
          </span>
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wide">
              {user?.plan === 'explorer' && 'Exploring your options'}
              {user?.plan === 'plus' && 'Scholar Plus active'}
              {user?.plan === 'pro' && 'Application Pro active'}
              {user?.plan === 'institutional' && 'Institutional access active'}
              {!user?.plan && 'Exploring your options'}
            </h4>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              {user?.plan === 'explorer' && 'You have 3 essay drafts and 1 mentor review available today. Upgrade to Scholar Plus for $5 to unlock 10 daily drafts and 2 monthly mentor reviews.'}
              {user?.plan === 'plus' && 'You have 10 essay drafts per day and 2 mentor reviews this month.'}
              {user?.plan === 'pro' && 'Unlimited essays and 4 mentor reviews this month.'}
              {user?.plan === 'institutional' && 'Full platform access provided by your institution.'}
              {!user?.plan && 'Browse scholarships and track progress unlimitedly. Upgrade to gain detailed matching indicators and higher essay caps!'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('billing')}
          className="px-4 py-2 bg-primary text-on-primary hover:bg-opacity-95 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer shadow-3xs self-start sm:self-auto"
        >
          {user?.plan && user.plan.toLowerCase() !== 'explorer' ? "Subscription Status" : "Explore Premium Plans"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Readiness Level (Spans 4) */}
        <div className="col-span-12 lg:col-span-4 premium-glass rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-secondary-container/10 rounded-full z-0"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Global Readiness</h3>
              <p className="text-sm text-on-surface-variant font-medium">Profile Score</p>
            </div>
            <span className="material-symbols-outlined text-outline-variant">info</span>
          </div>

          <div className="relative z-10 flex items-center gap-6 mt-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#e3e2e7" strokeWidth="8"></circle>
                <circle 
                  cx="50" 
                  cy="50" 
                  fill="transparent" 
                  r="40" 
                  stroke="#10B981" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * profileStrength) / 100} 
                  strokeLinecap="round" 
                  strokeWidth="8"
                ></circle>
              </svg>
              <div className="absolute flex items-center justify-center flex-col">
                <span className="text-2xl font-bold text-primary">{profileStrength}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {profileStrength > 75 
                  ? "Outstanding! Your profile displays high alignment with international scholarship requirements."
                  : "Good start. Add missing preferences and documents to elevate your eligibility probability."
                }
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-secondary-container/30 px-2.5 py-1 rounded-md mt-2">
                <span className="material-symbols-outlined text-xs">trending_up</span> {profileStrength > 75 ? "Top 5% Student profile" : "Active applicant status"}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper (Spans 8) */}
        <div className="col-span-12 lg:col-span-8 premium-glass rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold text-primary">Application Journey Tracking</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Summary of how your scholarships sit across stage limits</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('tracker')}
              className="text-xs text-primary font-bold hover:text-secondary hover:underline transition-all flex items-center gap-1"
            >
              Configure Tracker →
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-between mt-4 px-2 lg:px-8 bg-surface-container-low/40 rounded-xl p-4 border border-outline-variant/10">
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-outline-variant/30 rounded-full">
              <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${Math.min(100, (appliedCount + awardedCount) / Math.max(1, savedCount + draftingCount + appliedCount + awardedCount) * 100)}%` }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-surface-container-lowest border-2 border-outline-variant flex items-center justify-center font-bold text-sm text-primary">
                {savedCount}
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Saved</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-surface-container-lowest border-4 border-status-info flex items-center justify-center font-extrabold text-base text-status-info shadow-sm">
                {draftingCount}
              </div>
              <span className="text-[10px] font-bold text-status-info uppercase tracking-wider">Drafting</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary border-2 border-surface-container-lowest flex items-center justify-center font-bold text-sm text-white shadow-sm">
                {appliedCount}
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Applied</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-status-success border-2 border-surface-container-lowest flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              </div>
              <span className="text-[10px] font-bold text-status-success uppercase tracking-wider">Awarded ({awardedCount})</span>
            </div>
          </div>
        </div>

        {/* Profile Completion Warnings (Spans 4) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 premium-glass rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-widest">Onboarding Guide</h3>
            <span className="text-xs text-on-surface-variant font-bold">
              {mvspMissing.length === 0
                ? `${enrichMissing.length ? `${enrichMissing.length} to enhance` : 'Complete ✓'}`
                : `${mvspMissing.length} left`}
            </span>
          </div>

          <div className="space-y-2 mt-2 flex-grow">
            {mvspMissing.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-status-urgent uppercase tracking-wider mb-2">Required for matching:</p>
                {mvspMissing.map((f, id) => (
                  <div key={id} className="flex items-start gap-2 text-error text-xs font-medium bg-error-container/10 p-2 rounded-lg border border-error/5">
                    <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </>
            )}

            {mvspMissing.length === 0 && enrichMissing.length > 0 && (
              <>
                <div className="bg-secondary-container/23 border border-secondary/20 rounded-xl p-3 text-center flex flex-col items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-secondary text-2xl mb-1">check_circle</span>
                  <p className="text-[11px] font-medium text-primary">MVSP complete — matches ready!</p>
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Enhance your profile:</p>
                {enrichMissing.map((f, id) => (
                  <div key={id} className="flex items-start gap-2 text-secondary text-xs font-medium bg-secondary-container/10 p-2 rounded-lg border border-secondary/10">
                    <span className="material-symbols-outlined text-sm mt-0.5">add</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </>
            )}

            {mvspMissing.length === 0 && enrichMissing.length === 0 && (
              <div className="bg-secondary-container/23 border border-secondary/20 rounded-xl p-4 text-center mt-2 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-3xl mb-2">check_circle</span>
                <p className="text-xs font-medium text-primary">Your onboarding profile has been optimized. You are ready to generate custom matched letters!</p>
              </div>
            )}

            {(mvspMissing.length > 0 || enrichMissing.length > 0) && (
              <button 
                onClick={() => onNavigateToTab('profile')}
                className="w-full text-center text-xs text-secondary font-bold hover:underline py-2 block"
              >
                Go Update Profile →
              </button>
            )}
          </div>
        </div>

        {/* Urgent Deadlines (Spans 8) */}
        <div className="col-span-12 md:col-span-6 lg:col-span-8 premium-glass rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <h4 className="font-bold text-sm text-primary uppercase">Scholarships Nearing Deadline</h4>
            </div>
            <span className="text-[10px] text-on-surface-variant font-semibold bg-surface-container px-2 py-1 rounded">Action Required</span>
          </div>

          <div className="divide-y divide-outline-variant/30 overflow-y-auto max-h-[140px] pr-1">
            {(() => {
              const trackedIds = applications.filter(a => a.status && a.status !== 'not_started').map(a => a.scholarship_id);
              const sorted = scholarships
                .filter(s => trackedIds.includes(s.id) && s.deadline && !s.deadline.toLowerCase().includes('varies') && !s.deadline.toLowerCase().includes('annual'))
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                .slice(0, 5);
              if (sorted.length === 0) {
                return (
                  <div className="text-center py-8 text-on-surface-variant text-xs">
                    No tracked scholarships with approaching deadlines.
                  </div>
                );
              }
              return sorted.map(s => {
                const app = applications.find(a => a.scholarship_id === s.id);
                const appStatus = app && app.status !== 'not_started' ? app.status : 'Not Started';
                const daysLeft = Math.ceil((new Date(s.deadline).getTime() - Date.now()) / (1000*60*60*24));
                const isUrgent = daysLeft <= 30;
                return (
                  <div key={s.id} className="py-2.5 flex justify-between items-center bg-surface-container-lowest/45 px-3 rounded-lg border border-outline-variant/20 mb-2">
                    <div>
                      <h5 className="text-xs font-bold text-primary">{s.name}</h5>
                      <span className={`text-[9px] font-bold uppercase ${isUrgent ? 'text-status-urgent' : 'text-status-warning'}`}>Status: {appStatus}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${isUrgent ? 'text-status-urgent' : 'text-status-warning'}`}>{s.deadline}</span>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">{s.provider}</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      {/* Curated Matches section */}
      <div>
        <div className="flex justify-between items-end mb-6 px-2">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/10 text-secondary border border-secondary/20 text-[10px] font-extrabold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Live-Matched opportunities
            </span>
            <h3 className="font-display text-2xl font-black text-primary">Curated For Africa-Excellence</h3>
            <p className="text-sm text-on-surface-variant">Top programs with direct application lines that fit your academic persona</p>
          </div>
          <button 
            onClick={() => onNavigateToTab('scholarships')}
            className="text-xs font-bold text-secondary hover:text-primary transition-colors flex items-center gap-1 bg-surface py-2 px-4 rounded-full border border-outline-variant/50"
          >
            Explore Database
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {matchedScholarships.length === 0 && (
          <div className="col-span-full text-center py-12 bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-3">search</span>
            <p className="text-sm text-on-surface-variant font-medium">
              {confirmed.length === 0
                ? 'Complete your profile to see your scholarship matches.'
                : 'No matches found yet. Try adjusting your profile details.'}
            </p>
            <button onClick={() => onNavigateToTab('profile')} className="mt-4 px-6 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer">
              {confirmed.length === 0 ? 'Complete Profile' : 'Adjust Profile'}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchedScholarships.map((s) => {
            const score = s.match ? s.match.score : 0;
            return (
              <div 
                key={s.id}
                className="premium-glass rounded-3xl p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/10 rounded-bl-full -z-10 transition-transform group-hover:scale-105 pointer-events-none"></div>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-secondary-container/80 text-on-secondary-container border border-secondary/20 font-label-sm text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-extrabold shadow-sm backdrop-blur-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">star</span> {score}% Match
                    </span>
                    <span className="text-[11px] font-bold text-status-warning uppercase bg-status-warning/10 border border-status-warning/20 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  <h4 className="font-display text-lg font-black text-primary mb-1 group-hover:text-secondary transition-colors truncate">{s.name}</h4>
                  <p className="text-xs text-on-surface-variant mb-4 font-bold">{s.provider} • {s.host}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-surface-container-lowest text-on-surface-variant text-[11px] px-2.5 py-1 rounded-lg border border-outline-variant/30 flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">public</span> {s.country?.[0] || 'Global'}
                    </span>
                    <span className="bg-surface-container-lowest text-on-surface-variant text-[11px] px-2.5 py-1 rounded-lg border border-outline-variant/30 flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">payments</span> {s.funding_type} Funding
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => onViewScholarship(s)}
                  className="w-full py-3 bg-surface-container-lowest border-2 border-outline-variant/30 text-primary rounded-xl font-bold hover:bg-primary hover:border-primary hover:text-white transition-all shadow-sm group-hover:shadow-md cursor-pointer"
                >
                  Review & Apply
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
