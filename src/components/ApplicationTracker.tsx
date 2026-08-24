import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarClock, ExternalLink, Inbox, Trash2 } from 'lucide-react';
import { Scholarship, ApplicationTracker as TrackerType } from '../types';
import { flagFor } from '../lib/flags';
import ConfirmationDialog from './ConfirmationDialog';
import { SEO } from './SEO';

interface ApplicationTrackerProps {
  scholarships: Scholarship[];
  applications: TrackerType[];
  onTrackScholarship: (scholarshipId: string, status: string, notes?: string, priority?: any) => void;
  onRemoveTrack: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

const STAGES = [
  'All', 'Saved', 'Drafting', 'Preparing Documents', 'Essay Drafting', 'Ready to Submit',
  'Applied', 'Interview', 'Awarded', 'Rejected',
] as const;

const STAGE_TONE: Record<string, string> = {
  Saved: 'bg-parchment text-graphite',
  Drafting: 'bg-electric-lime text-off-black-ink',
  'Preparing Documents': 'bg-electric-lime text-off-black-ink',
  'Essay Drafting': 'bg-electric-lime text-off-black-ink',
  'Ready to Submit': 'bg-off-black-ink text-pure-white',
  Applied: 'bg-off-black-ink text-pure-white',
  Interview: 'bg-deep-charcoal text-pure-white',
  Awarded: 'bg-electric-lime text-off-black-ink',
  Rejected: 'bg-error/10 text-error',
};

function daysLeft(deadline: string): number | null {
  if (!deadline) return null;
  const t = Date.parse(deadline);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export default function ApplicationTracker({
  scholarships,
  applications,
  onTrackScholarship,
  onRemoveTrack,
}: ApplicationTrackerProps) {
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('stage') || 'All');
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(scholarships.map(s => [s.id, s])), [scholarships]);

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      if (app.status === 'not_started') continue;
      counts.set(app.status, (counts.get(app.status) || 0) + 1);
    }
    return counts;
  }, [applications]);

  const rows = useMemo(() => {
    return applications
      .filter(app => app.status !== 'not_started')
      .filter(app => filterStatus === 'All' || app.status === filterStatus)
      .map(app => ({ app, s: byId.get(app.scholarship_id) }))
      .sort((a, b) => {
        const da = a.s?.deadline ? Date.parse(a.s.deadline) : Infinity;
        const db = b.s?.deadline ? Date.parse(b.s.deadline) : Infinity;
        return da - db;
      });
  }, [applications, filterStatus, byId]);

  const saveNote = (app: TrackerType) => {
    onTrackScholarship(app.scholarship_id, app.status, editingNotes, app.priority);
    setNoteEditId(null);
  };

  return (
    <div className="animate-sweep">
      <SEO title="Application Tracker | Techsari" description="Track every scholarship from saved to awarded, with deadlines sorted by what closes next." path="/applicationtracker" noindex />

      <span className="text-ed-eyebrow uppercase text-graphite">Applications</span>
      <h1 className="mt-2 text-ed-h1-sm text-off-black-ink tracking-tight">Your application pipeline.</h1>
      <p className="mt-2 text-ed-body text-graphite max-w-[56ch]">
        Every scholarship you have saved, drafted or submitted — with deadlines
        sorted so the next one closing always sits on top.
      </p>

      {/* Stage filter pills */}
      <div className="mt-8 flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by stage">
        {STAGES.map(stage => {
          const active = filterStatus === stage;
          const count = stage === 'All' ? applications.filter(a => a.status !== 'not_started').length : stageCounts.get(stage) || 0;
          return (
            <button
              key={stage}
              role="tab"
              aria-selected={active}
              onClick={() => setFilterStatus(stage)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium transition-all cursor-pointer ${
                active
                  ? 'bg-off-black-ink text-pure-white'
                  : 'bg-pure-white border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink'
              }`}
            >
              {stage}
              <span
                className={`inline-flex min-w-5 h-5 px-1 rounded-full text-[10px] font-medium items-center justify-center ${
                  active ? 'bg-electric-lime text-off-black-ink' : 'bg-parchment text-graphite'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="mt-10 bg-parchment border border-ash rounded-ed py-16 px-6 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pure-white border border-ash mb-5" aria-hidden>
            <Inbox className="w-5 h-5 text-graphite" strokeWidth={1.5} />
          </span>
          <p className="text-ed-sub text-off-black-ink">
            {filterStatus === 'All' ? 'No tracked scholarships yet.' : `Nothing in ${filterStatus} yet.`}
          </p>
          <p className="mt-2 text-ed-body text-graphite">
            Save a scholarship from the finder and it lands here automatically.
          </p>
          <Link
            to="/scholarships"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-electric-lime px-6 min-h-[48px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all"
          >
            Find scholarships to apply
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map(({ app, s }) => {
            const dl = s?.deadline ? daysLeft(s.deadline) : null;
            const urgent = dl !== null && dl <= 14;
            return (
              <li
                key={app.id || `${app.user_email}-${app.scholarship_id}`}
                className={`bg-pure-white border rounded-ed p-5 md:p-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 transition-colors ${
                  urgent ? 'border-error/40' : 'border-ash hover:border-graphite/50'
                }`}
              >
                {/* Scholarship identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg leading-none" aria-hidden>{flagFor(s)}</span>
                    {s ? (
                      <Link
                        to={`/scholarships/browse/${s.slug || s.id}`}
                        className="text-ed-sub tracking-tight text-off-black-ink hover:text-graphite transition-colors truncate max-w-[420px]"
                      >
                        {s.name}
                      </Link>
                    ) : (
                      <span className="text-ed-sub tracking-tight text-graphite">Removed listing</span>
                    )}
                    {s && <ExternalLink className="w-3.5 h-3.5 text-stone shrink-0" aria-hidden />}
                  </div>
                  <p className="mt-1 text-ed-body-sm text-graphite truncate">
                    {s?.provider || '—'}
                    {s?.amount ? ` · ${s.amount}` : ''}
                  </p>
                </div>

                {/* Deadline */}
                <div className={`shrink-0 flex items-center gap-1.5 text-ed-body-sm ${urgent ? 'text-error font-medium' : 'text-graphite'}`}>
                  <CalendarClock className="w-4 h-4 shrink-0" aria-hidden />
                  {dl === null
                    ? 'No deadline listed'
                    : dl <= 0
                      ? 'Closing today'
                      : `${dl} day${dl === 1 ? '' : 's'} left`}
                </div>

                {/* Stage select */}
                <div className="shrink-0">
                  <label className="sr-only" htmlFor={`stage-${app.scholarship_id}`}>Tracking stage</label>
                  <select
                    id={`stage-${app.scholarship_id}`}
                    value={app.status}
                    onChange={e => onTrackScholarship(app.scholarship_id, e.target.value, app.notes, app.priority)}
                    className={`appearance-none rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium border cursor-pointer focus:outline-none focus:border-graphite ${STAGE_TONE[app.status] || 'bg-parchment text-graphite border-ash'}`}
                  >
                    {STAGES.filter(x => x !== 'All').map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="min-w-0 flex-1 lg:max-w-[280px]">
                  {noteEditId === app.scholarship_id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingNotes}
                        onChange={e => setEditingNotes(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveNote(app); }}
                        placeholder="Add a note…"
                        className="w-full bg-parchment border border-ash rounded-lg px-3 py-2 min-h-[40px] text-ed-body-sm text-off-black-ink focus:outline-none focus:border-graphite"
                      />
                      <button
                        onClick={() => saveNote(app)}
                        className="shrink-0 rounded-full bg-electric-lime px-4 min-h-[40px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover transition-colors cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNoteEditId(app.scholarship_id); setEditingNotes(app.notes || ''); }}
                      className={`w-full text-left text-ed-body-sm truncate min-h-[40px] cursor-pointer ${
                        app.notes ? 'text-off-black-ink' : 'text-stone hover:text-graphite transition-colors'
                      }`}
                      title="Edit note"
                    >
                      {app.notes || 'Add a note…'}
                    </button>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => setDeleteConfirmId(app.scholarship_id)}
                  aria-label={`Stop tracking ${s?.name || 'this scholarship'}`}
                  className="icon-btn shrink-0 inline-flex items-center justify-center rounded-full border border-ash text-graphite hover:text-error hover:border-error transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {deleteConfirmId && (
        <ConfirmationDialog
          isOpen
          title="Stop tracking this scholarship?"
          message="It will be removed from your pipeline. You can always track it again from the finder."
          confirmText="Stop tracking"
          onConfirm={() => { onRemoveTrack(deleteConfirmId); setDeleteConfirmId(null); }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}