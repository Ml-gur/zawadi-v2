import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AdminUserProfile, UserEngagement, callAdminApi } from '../../../lib/admin-api';
import { DataTable } from '../ui/DataTable';
import { AdminSectionShell } from '../ui/AdminSectionShell';
import { UserDrawer } from './UserDrawer';

interface UsersResponse {
  users: AdminUserProfile[];
  engagement: Record<string, UserEngagement>;
  page: number;
  limit: number;
  total: number;
}

const LIMIT = 25;

export function UsersTab() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminUserProfile | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callAdminApi<UsersResponse>('users.list', { page, limit: LIMIT, search: search || undefined, plan, status })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError('');
        setSelected((prev) => prev ? res.users.find((u) => u.email === prev.email) ?? null : null);
      })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, plan, status]);

  const pages = useMemo(() => (data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1), [data]);

  const refresh = () => {
    setLoading(true);
    callAdminApi<UsersResponse>('users.list', { page, limit: LIMIT, search: search || undefined, plan, status })
      .then((res) => {
        setData(res);
        setError('');
        setSelected((prev) => prev ? res.users.find((u) => u.email === prev.email) ?? null : null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  return (
    <AdminSectionShell
      title="Users"
      description="Every scholar on the platform, with live engagement counts and working account controls."
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-graphite absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="w-full bg-pure-white border border-ash rounded-full pl-10 pr-4 min-h-[44px] text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value); setPage(1); }}
          aria-label="Filter by plan"
          className="bg-pure-white border border-ash rounded-full px-4 min-h-[44px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer"
        >
          <option value="all">All plans</option>
          <option value="explorer">Explorer</option>
          <option value="plus">Scholar Plus</option>
          <option value="pro">Application Pro</option>
          <option value="institutional">Institutional</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          aria-label="Filter by status"
          className="bg-pure-white border border-ash rounded-full px-4 min-h-[44px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <p className="mb-4 text-ed-body-sm text-error">{error}</p>}

      <DataTable<AdminUserProfile>
        columns={[
          {
            key: 'name', header: 'User',
            render: (u) => (
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-parchment text-off-black-ink text-[11px] font-medium uppercase shrink-0" aria-hidden>
                  {(u.name || u.email).substring(0, 2)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name || u.email.split('@')[0]}</p>
                  <p className="text-ed-caption tracking-normal text-graphite truncate">{u.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'country', header: 'Country', render: (u) => <span className="text-graphite">{u.country || '—'}</span> },
          {
            key: 'plan', header: 'Plan',
            render: (u) => <span className="inline-block bg-parchment text-graphite text-[10px] font-medium uppercase px-2 py-0.5 rounded-full">{u.plan}</span>,
          },
          {
            key: 'status', header: 'Status',
            render: (u) => (
              <span className={`inline-block text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                u.status === 'active' ? 'bg-electric-lime text-off-black-ink' : 'bg-error/10 text-error'
              }`}>
                {u.status}
              </span>
            ),
          },
          {
            key: 'engagement', header: 'Activity',
            render: (u) => {
              const eng = data?.engagement[u.email];
              if (!eng) return <span className="text-graphite">—</span>;
              return (
                <span className="text-ed-caption tracking-normal text-graphite tabular-nums">
                  {eng.applications} apps · {eng.documents} docs · {eng.essays} essays
                </span>
              );
            },
          },
          {
            key: 'created_at', header: 'Joined',
            render: (u) => <span className="text-graphite whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}</span>,
          },
        ]}
        rows={data?.users ?? []}
        rowKey={(u) => u.email}
        onRowClick={setSelected}
        emptyMessage={search || plan !== 'all' || status !== 'all' ? 'No users match these filters.' : 'No users yet — they appear here the moment someone signs up.'}
        loading={loading}
      />

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-ed-body-sm text-graphite">
          <span>Page {page} of {pages} · {data?.total ?? 0} users</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Previous</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Next</button>
          </div>
        </div>
      )}

      <UserDrawer user={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </AdminSectionShell>
  );
}
