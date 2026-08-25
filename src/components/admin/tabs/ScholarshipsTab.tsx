import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Scholarship } from '../../../types';
import { AdminSectionShell } from '../ui/AdminSectionShell';
import { DataTable } from '../ui/DataTable';
import ConfirmationDialog from '../../ConfirmationDialog';
import { ScholarshipForm, ScholarshipFormValues } from './ScholarshipForm';

interface ScholarshipsTabProps {
  scholarships: Scholarship[];
  onAddScholarship: (schol: Partial<Scholarship>) => void;
  onRemoveScholarship: (id: string) => void;
  onBulkRemoveScholarships: (ids: string[]) => void;
  onBulkSetPublished: (ids: string[], published: boolean) => Promise<void>;
  onTogglePublish: (id: string) => Promise<void>;
}

function downloadCSV(scholarships: Scholarship[]) {
  const esc = (val: unknown) => {
    if (val === null || val === undefined) return '""';
    let text = Array.isArray(val) ? val.join('; ') : String(val);
    if (text.includes(',') || text.includes('"') || /[\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const headers = ['ID', 'Name', 'Provider', 'Host', 'Funding', 'Amount', 'Deadline', 'Countries', 'Degrees', 'Fields', 'Apply URL', 'Published'];
  const rows = scholarships.map((s) => [
    s.id, s.name, s.provider, s.host, s.funding_type, s.amount, s.deadline,
    s.country, s.degree_levels, s.fields, s.apply_url, s.published ? 'TRUE' : 'FALSE',
  ].map(esc).join(','));
  const blob = new Blob(['\ufeff' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `techsari_listings_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ScholarshipsTab({ scholarships, onAddScholarship, onRemoveScholarship, onBulkRemoveScholarships, onBulkSetPublished, onTogglePublish }: ScholarshipsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<'unpublish' | 'publish' | 'delete' | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Scholarship | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scholarships.filter((s) => {
      const matchesSearch = !q || s.name?.toLowerCase().includes(q) || s.provider?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'published' ? s.published : !s.published);
      return matchesSearch && matchesStatus;
    });
  }, [scholarships, search, statusFilter]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: Scholarship) => { setEditing(s); setFormOpen(true); };

  const handleSubmit = (values: ScholarshipFormValues) => {
    onAddScholarship({
      ...(editing ? { id: editing.id } : {}),
      ...values,
    });
    setFormOpen(false);
  };

  return (
    <AdminSectionShell
      title="Scholarships"
      description="Every listing on the platform. Edits go live the moment you save."
      actions={
        <>
          <button
            onClick={() => downloadCSV(filtered)}
            className="inline-flex items-center gap-2 rounded-full border border-ash px-4 min-h-[44px] text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-electric-lime px-5 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add scholarship
          </button>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-graphite absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or provider…"
            aria-label="Search scholarships"
            className="w-full bg-pure-white border border-ash rounded-full pl-10 pr-4 min-h-[44px] text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filter by status"
          className="bg-pure-white border border-ash rounded-full px-4 min-h-[44px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer"
        >
          <option value="all">All listings</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        {selectedIds.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-off-black-ink px-2 py-1.5">
            <span className="text-ed-body-sm font-medium text-pure-white pl-3 tabular-nums">{selectedIds.length} selected</span>
            <button
              onClick={() => { onBulkSetPublished(selectedIds, true); setSelectedIds([]); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-electric-lime px-4 min-h-[36px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Publish
            </button>
            <button
              onClick={() => { onBulkSetPublished(selectedIds, false); setSelectedIds([]); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone px-4 min-h-[36px] text-ed-body-sm font-medium text-smoke hover:text-pure-white hover:border-pure-white transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Unpublish
            </button>
            <button
              onClick={() => setBulkConfirm('delete')}
              aria-label="Unpublish selected permanently from finder"
              className="icon-btn inline-flex items-center justify-center rounded-full text-smoke hover:text-error transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <DataTable<Scholarship>
        columns={[
          {
            key: 'select', header: '', className: 'w-10',
            render: (s) => (
              <input
                type="checkbox"
                aria-label={`Select ${s.name}`}
                checked={selectedIds.includes(s.id)}
                onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 cursor-pointer accent-[#466800]"
              />
            ),
          },
          {
            key: 'name', header: 'Listing',
            render: (s) => (
              <div className="min-w-0">
                <p className="font-medium truncate max-w-[320px]">{s.name}</p>
                <p className="text-ed-caption tracking-normal text-graphite truncate">{s.provider || '—'}</p>
              </div>
            ),
          },
          { key: 'deadline', header: 'Deadline', render: (s) => <span className="text-graphite whitespace-nowrap tabular-nums">{s.deadline || '—'}</span> },
          { key: 'amount', header: 'Value', render: (s) => <span className="text-graphite truncate block max-w-[160px]">{s.amount || '—'}</span> },
          {
            key: 'published', header: 'Status',
            render: (s) => (
              <span className={`inline-block text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${s.published ? 'bg-electric-lime text-off-black-ink' : 'bg-parchment text-graphite'}`}>
                {s.published ? 'Live' : 'Draft'}
              </span>
            ),
          },
          {
            key: 'actions', header: '',
            render: (s) => (
              <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onTogglePublish(s.id)}
                  aria-label={s.published ? `Unpublish ${s.name}` : `Publish ${s.name}`}
                  className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
                >
                  {s.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  aria-label={`Edit ${s.name}`}
                  className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(s.id)}
                  aria-label={`Delete ${s.name}`}
                  className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-error transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
        rows={filtered}
        rowKey={(s) => s.id}
        onRowClick={openEdit}
        emptyMessage={search || statusFilter !== 'all' ? 'No listings match these filters.' : 'No listings yet — add your first scholarship or run a crawler campaign.'}
      />

      <ScholarshipForm
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Unpublish this listing?"
        message="It will be removed from the public finder. You can republish it anytime."
        confirmText="Unpublish"
        onConfirm={() => { if (deleteTarget) onRemoveScholarship(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmationDialog
        isOpen={bulkConfirm === 'delete'}
        title={`Unpublish ${selectedIds.length} listings?`}
        message="They will be removed from the public finder in one action."
        confirmText="Unpublish all"
        onConfirm={() => { onBulkRemoveScholarships(selectedIds); setSelectedIds([]); setBulkConfirm(null); }}
        onCancel={() => setBulkConfirm(null)}
      />
    </AdminSectionShell>
  );
}
