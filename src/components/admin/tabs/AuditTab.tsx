import { useEffect, useState } from 'react';
import { callAdminApi, AuditEntry } from '../../../lib/admin-api';
import { DataTable } from '../ui/DataTable';
import { AdminSectionShell } from '../ui/AdminSectionShell';

export function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callAdminApi<{ entries: AuditEntry[]; total: number }>('audit.list', { page, limit: 30 })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.entries);
        setTotal(data.total);
        setError('');
      })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <AdminSectionShell
      title="Audit trail"
      description="Every admin action, recorded as it happens — who did what, to which record."
    >
      {error && <p className="mb-4 text-ed-body-sm text-error">{error}</p>}
      <DataTable<AuditEntry>
        columns={[
          { key: 'action', header: 'Action', render: (e) => <span className="font-medium">{e.action || '—'}</span> },
          { key: 'admin_email', header: 'By' },
          { key: 'target_id', header: 'Target', render: (e) => <span className="text-graphite">{e.target_type || ''} {e.target_id || ''}</span> },
          { key: 'details', header: 'Details', render: (e) => <span className="text-graphite truncate block max-w-[280px]">{e.details || '—'}</span> },
          {
            key: 'created_at', header: 'When',
            render: (e) => e.created_at ? new Date(e.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—',
          },
        ]}
        rows={entries}
        rowKey={(e) => e.id}
        emptyMessage="No admin actions recorded yet. Actions appear here the moment they happen."
        loading={loading}
      />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-ed-body-sm text-graphite">
          <span>Page {page} of {pages} · {total} entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Previous</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Next</button>
          </div>
        </div>
      )}
    </AdminSectionShell>
  );
}
