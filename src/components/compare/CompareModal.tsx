import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Scholarship } from '../../types';
import { flagFor } from '../../lib/flags';

interface CompareModalProps {
  open: boolean;
  scholarships: Scholarship[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

function daysUntil(deadline: string): number | null {
  if (!deadline) return null;
  const t = Date.parse(deadline);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function DeadlineCell({ s }: { s: Scholarship }) {
  const d = daysUntil(s.deadline);
  if (d === null) return <span>{s.deadline || 'Rolling'}</span>;
  return (
    <span className={d <= 7 ? 'font-medium text-ed-error' : ''}>
      {s.deadline} · {d <= 0 ? 'closing today' : `${d} day${d === 1 ? '' : 's'} left`}
    </span>
  );
}

const ROWS: Array<{ label: string; render: (s: Scholarship) => ReactNode }> = [
  { label: 'Provider', render: s => s.provider },
  { label: 'Amount offered', render: s => s.amount || '—' },
  { label: 'Funding type', render: s => s.funding_type || '—' },
  {
    label: 'Open to',
    render: s => (
      <span className="inline-flex items-start gap-1.5">
        <span aria-hidden className="leading-5">{flagFor(s)}</span>
        <span>{(s.countries || []).length > 0 ? s.countries.join(', ') : 'All African countries'}</span>
      </span>
    ),
  },
  { label: 'Degree levels', render: s => s.degree_levels?.join(', ') || '—' },
  {
    label: 'Fields granted',
    render: s => {
      const fields = s.fields_of_study || s.fields || [];
      return fields.length > 0 ? fields.join(', ') : 'All fields';
    },
  },
  { label: 'Host region', render: s => s.host_region || '—' },
  { label: 'Deadline', render: s => <DeadlineCell s={s} /> },
  {
    label: 'English testing',
    render: s =>
      s.no_ielts
        ? <span className="inline-block rounded-full bg-electric-lime px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-off-black-ink">No IELTS · MOI accepted</span>
        : 'Standard proof required',
  },
];

export default function CompareModal({ open, scholarships, onRemove, onClose }: CompareModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-off-black-ink/65 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Compare selected scholarships"
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="animate-sweep bg-pure-white border border-ash rounded-ed w-full max-w-4xl p-6 md:p-8 relative"
          onClick={e => e.stopPropagation()}
        >
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close comparison"
            className="icon-btn absolute top-4 right-4 inline-flex items-center justify-center rounded-full border border-ash text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>

          <h3 className="text-heading tracking-tight text-off-black-ink">Side-by-side comparison</h3>
          <p className="text-ed-body-sm text-graphite mt-1">Funding, deadlines and testing waivers across your shortlist.</p>

          {scholarships.length === 0 ? (
            <p className="py-12 text-center text-ed-body-sm text-graphite">
              Nothing selected yet. Use the “Compare” button on any featured card below.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto pb-1">
              <table className="w-full min-w-[520px] text-left border-collapse text-ed-body-sm">
                <thead>
                  <tr className="border-b border-ash align-bottom">
                    <th scope="col" className="py-3 pr-4 font-medium text-graphite text-ed-caption uppercase tracking-wide w-32">Attribute</th>
                    {scholarships.map(s => (
                      <th scope="col" key={s.id} className="py-3 pr-4 min-w-[180px]">
                        <Link
                          to={`/scholarships/browse/${s.slug || s.id}`}
                          className="text-subheading tracking-tight text-off-black-ink hover:text-graphite transition-colors"
                        >
                          {s.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(row => (
                    <tr key={row.label} className="border-b border-ash/70">
                      <th scope="row" className="py-3.5 pr-4 text-left font-medium text-graphite">{row.label}</th>
                      {scholarships.map(s => (
                        <td key={s.id} className="py-3.5 pr-4 text-off-black-ink align-top">{row.render(s)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-3.5 pr-4 text-left font-medium text-graphite">Shortlist</th>
                    {scholarships.map(s => (
                      <td key={s.id} className="py-3.5 pr-4">
                        <button
                          onClick={() => onRemove(s.id)}
                          className="text-ed-body-sm text-graphite underline underline-offset-4 decoration-ash hover:text-error hover:decoration-error transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
