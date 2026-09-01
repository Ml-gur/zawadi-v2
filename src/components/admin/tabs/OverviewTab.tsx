import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Bot, FileWarning, CalendarClock, Mail, Users as UsersIcon, BookOpen, ClipboardList, Wallet } from 'lucide-react';
import type { AdminOverview, Timeseries } from '../../../lib/admin-api';
import { StatCard } from '../ui/StatCard';
import type { AdminSection } from '../../AdminPortal';

interface OverviewTabProps {
  overview: AdminOverview | null;
  timeseries: Timeseries | null;
  loading: boolean;
  onNavigate: (section: AdminSection) => void;
}

const INK = '#14140f';
const GRAPHITE = '#6e6e64';

function SkeletonCard() {
  return <div className="bg-pure-white border border-ash rounded-ed p-5 h-[124px] animate-pulse" />;
}

export function OverviewTab({ overview, timeseries, loading, onNavigate }: OverviewTabProps) {
  if (loading && !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="h-24 bg-pure-white border border-ash rounded-ed animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-56 bg-pure-white border border-ash rounded-ed animate-pulse" />
          <div className="h-56 bg-pure-white border border-ash rounded-ed animate-pulse" />
        </div>
      </div>
    );
  }
  if (!overview) return null;

  const userDelta = overview.users.new_7d - overview.users.prev_7d;
  const attentionItems: { label: string; count: number; icon: typeof Bot; section?: AdminSection }[] = [
    { label: 'bot items awaiting review', count: overview.bot_queue.pending, icon: Bot, section: 'bot_queue' },
    { label: 'scholarships closing within 7 days', count: overview.scholarships.expiring_7d, icon: CalendarClock, section: 'scholarships' },
    { label: 'unread contact messages', count: overview.contact.unread, icon: Mail },
  ];
  const attention = attentionItems.filter((item) => item.count > 0);

  const growthData = (timeseries?.user_growth ?? []).map((g) => ({
    name: g.month.split('-').slice(1).join('/'),
    users: g.users,
  }));
  const essayData = (timeseries?.essays_daily ?? []).map((d) => ({
    name: d.date.slice(5),
    essays: d.count,
  }));

  return (
    <div className="space-y-6 animate-sweep">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Users"
          value={overview.users.total.toLocaleString()}
          delta={overview.users.new_7d}
          deltaLabel="joined this week"
          icon={UsersIcon}
          onClick={() => onNavigate('users')}
        />
        <StatCard
          label="MRR"
          value={overview.payments.mrr.toLocaleString()}
          deltaLabel={`${overview.payments.successful} successful payment${overview.payments.successful === 1 ? '' : 's'}`}
          icon={Wallet}
          onClick={() => onNavigate('payments')}
        />
        <StatCard
          label="Live scholarships"
          value={overview.scholarships.published}
          deltaLabel={`${overview.scholarships.total - overview.scholarships.published} unpublished · ${overview.scholarships.expiring_7d} closing soon`}
          icon={BookOpen}
          onClick={() => onNavigate('scholarships')}
        />
        <StatCard
          label="Pipeline"
          value={overview.applications.total}
          deltaLabel={`${overview.essays.total} essays · ${overview.documents.total} documents`}
          icon={ClipboardList}
        />
      </div>

      {attention.length > 0 && (
        <div className="bg-off-black-ink text-pure-white rounded-ed p-5">
          <p className="text-ed-eyebrow uppercase text-smoke">Needs your attention</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {attention.map(({ label, count, icon: Icon, section }) => (
              <button
                key={label}
                onClick={section ? () => onNavigate(section) : undefined}
                disabled={!section}
                className={`inline-flex items-center gap-2 rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium transition-colors ${
                  section ? 'bg-pure-white/10 hover:bg-pure-white/20 cursor-pointer' : 'bg-pure-white/5 cursor-default'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-electric-lime" aria-hidden />
                <strong className="font-semibold tabular-nums">{count}</strong>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-pure-white border border-ash rounded-ed p-5">
          <h3 className="text-ed-body-sm font-medium text-off-black-ink">User growth</h3>
          <p className="text-ed-caption tracking-normal text-graphite">New registrations per month</p>
          <div className="h-44 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: GRAPHITE }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(20, 20, 15, 0.04)' }} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #d2d2c8' }} />
                <Bar dataKey="users" fill={INK} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-pure-white border border-ash rounded-ed p-5">
          <h3 className="text-ed-body-sm font-medium text-off-black-ink">Essay activity</h3>
          <p className="text-ed-caption tracking-normal text-graphite">Generated per day, last 14 days</p>
          <div className="h-44 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={essayData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: GRAPHITE }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #d2d2c8' }} />
                <Line type="monotone" dataKey="essays" stroke={INK} strokeWidth={2} dot={{ r: 2.5, fill: INK }} activeDot={{ r: 4, fill: '#beff50', stroke: INK }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-pure-white border border-ash rounded-ed p-5">
          <h3 className="text-ed-body-sm font-medium text-off-black-ink mb-3">Newest scholars</h3>
          {(timeseries?.recent_signups?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-ash">
              {timeseries!.recent_signups.map((s) => (
                <li key={s.email} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ed-body-sm text-off-black-ink truncate">{s.name || s.email.split('@')[0]}</p>
                    <p className="text-ed-caption tracking-normal text-graphite truncate">{s.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block bg-parchment text-graphite text-[10px] font-medium uppercase px-2 py-0.5 rounded-full">{s.plan}</span>
                    <p className="text-ed-caption tracking-normal text-graphite mt-0.5">{s.country || '—'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ed-body-sm text-graphite py-6 text-center">No signups yet.</p>
          )}
        </div>

        <div className="bg-pure-white border border-ash rounded-ed p-5">
          <h3 className="text-ed-body-sm font-medium text-off-black-ink mb-3">Most viewed listings</h3>
          {(timeseries?.top_scholarships?.length ?? 0) > 0 ? (
            <ul className="divide-y divide-ash">
              {timeseries!.top_scholarships.slice(0, 5).map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-ed-body-sm text-off-black-ink truncate min-w-0">{s.name}</p>
                  <span className="text-ed-caption tracking-normal text-graphite tabular-nums shrink-0">{s.view_count} views</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ed-body-sm text-graphite py-6 text-center">No listing views recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
