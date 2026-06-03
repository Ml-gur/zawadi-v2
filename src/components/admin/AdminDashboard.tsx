import React from 'react';
import { RefreshCw, Play, Check, X, Download, Plus, Bot, Users, CreditCard, ExternalLink, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Scholarship, BotQueueIngestion } from '../../types';

interface AdminDashboardProps {
  scholarshipsCount: number;
  publishedCount: number;
  usersCount: number;
  activeUsersCount: number;
  activeSubscriptionsCount: number;
  mrrValue: number;
  totalApplications: number;
  totalDocuments: number;
  totalEssays: number;
  pendingBotCount: number;
  distribution: { explorer: number; plus: number; pro: number; institutional: number };
  userGrowth: { month: string; users: number }[];
  appStatusBreakdown: Record<string, number>;
  essayTrend: { date: string; essays: number }[];
  recentBotQueues: any[];
  isScraping: boolean;
  onRunBot: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenCreateModal: () => void;
  onExportUsersCSV: () => void;
  onReviewBotItem: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export default function AdminDashboard({
  scholarshipsCount,
  publishedCount,
  usersCount,
  activeUsersCount,
  activeSubscriptionsCount,
  mrrValue,
  totalApplications,
  totalDocuments,
  totalEssays,
  pendingBotCount,
  distribution,
  userGrowth,
  appStatusBreakdown,
  essayTrend,
  recentBotQueues = [],
  isScraping,
  onRunBot,
  onNavigateToTab,
  onOpenCreateModal,
  onExportUsersCSV,
  onReviewBotItem
}: AdminDashboardProps) {

  // Build chart data from real distribution
  const planMixData = [
    { name: 'Explorer (Free)', value: distribution.explorer || 1, color: '#001736' },
    { name: 'Scholar Plus', value: distribution.plus || 0, color: '#006c49' },
    { name: 'Pro Plan', value: distribution.pro || 0, color: '#6cf8bb' },
    { name: 'Institutional', value: distribution.institutional || 0, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  // Build growth chart from real user data, or fallback
  const growthData = userGrowth.length > 0 ? userGrowth.map((g, i) => ({
    name: g.month,
    users: g.users
  })) : [
    { name: 'N/A', users: usersCount || 1 }
  ];

  // Essay trend chart (or fallback)
  const essayChart = essayTrend.length > 0 ? essayTrend.map(e => ({
    name: e.date?.substring(5) || e.date,
    essays: e.essays
  })) : [];

  return (
    <div className="space-y-6 animate-sweep">
      
      {/* Top row Stats Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total scholarships card */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex justify-between items-start transition-all hover:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Scholarships</span>
            <p className="text-3xl font-display font-black text-primary">{scholarshipsCount}</p>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className="text-secondary font-bold">{publishedCount} published</span>
              <span className="text-on-surface-variant/75">· {scholarshipsCount - publishedCount} drafts</span>
            </div>
          </div>
          <div className="p-3 bg-primary-fixed rounded-xl text-primary">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex justify-between items-start transition-all hover:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Users</span>
            <p className="text-3xl font-display font-black text-primary">{usersCount}</p>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className="text-secondary font-bold">{activeUsersCount} active</span>
              <span className="text-on-surface-variant/75">· {usersCount - activeUsersCount} inactive</span>
            </div>
          </div>
          <div className="p-3 bg-primary-fixed rounded-xl text-primary">
            <Users className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex justify-between items-start transition-all hover:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Subscriptions</span>
            <p className="text-3xl font-display font-black text-primary">{activeSubscriptionsCount}</p>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className="text-secondary font-bold">${mrrValue}/mo MRR</span>
              <span className="text-on-surface-variant/75">· {totalApplications} applications</span>
            </div>
          </div>
          <div className="p-3 bg-primary-fixed rounded-xl text-primary">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex justify-between items-start transition-all hover:shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Engagement</span>
            <p className="text-3xl font-display font-black text-primary">{totalEssays}</p>
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <span className="text-secondary font-bold">{totalDocuments} documents</span>
              <span className="text-on-surface-variant/75">· {totalEssays} essays</span>
            </div>
          </div>
          <div className="p-3 bg-primary-fixed rounded-xl text-primary border border-outline-variant/20">
            <span className="text-lg">📊</span>
          </div>
        </div>

      </div>

      {/* Grid of Quick Actions and Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column (4 cols): Quick actions */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h3 className="font-display font-black text-primary text-sm uppercase tracking-wide">Quick Actions</h3>
          
          {/* Action 1: Review Bot Queue */}
          <button 
            onClick={() => onNavigateToTab('bot_queue')}
            className="w-full text-left bg-primary text-on-primary hover:bg-primary-container p-5 rounded-2xl transition-all shadow-xs flex justify-between items-center group cursor-pointer"
          >
            <div>
              <p className="font-bold text-sm">Review Bot Queue</p>
              <p className="text-xs text-on-primary-container/85 mt-1">{pendingBotCount} opportunities pending review</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 text-on-primary-fixed" />
            </div>
          </button>

          {/* Action 2: Add Manual Scholarship */}
          <button 
            onClick={onOpenCreateModal}
            className="w-full text-left bg-secondary-container hover:bg-secondary text-primary hover:text-white p-5 rounded-2xl transition-all shadow-xs flex justify-between items-center group cursor-pointer border border-secondary/20"
          >
            <div>
              <p className="font-bold text-sm">Add New Scholarship</p>
              <p className="text-xs opacity-90 mt-1">Manual vetted entry form</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {/* Action 3: Export Users as CSV */}
          <button 
            onClick={onExportUsersCSV}
            className="w-full text-left bg-surface-container-lowest border border-outline-variant/80 hover:bg-surface-container-low p-5 rounded-2xl transition-all shadow-xs flex justify-between items-center group cursor-pointer"
          >
            <div>
              <p className="font-bold text-sm text-primary">Export User Data</p>
              <p className="text-xs text-on-surface-variant mt-1">Download profile statistics CSV</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Download className="w-5 h-5 text-on-surface" />
            </div>
          </button>

        </div>

        {/* Middle column (4 cols): User Growth charts */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h4 className="font-display font-black text-primary text-sm">User Growth</h4>
            <p className="text-[10px] text-on-surface-variant">New user registrations per month</p>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#747780' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="users" fill="#006c49" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center text-[10px] text-outline font-semibold pt-2 border-t border-outline-variant/30">
            <span>{growthData[0]?.name || 'Start'}</span>
            <span>{growthData[growthData.length - 1]?.name || 'Now'}</span>
          </div>
        </div>

        {/* Right column (4 cols): Plan distribution mix chart */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-display font-black text-primary text-sm">Subscription Mix</h4>
            <p className="text-[10px] text-on-surface-variant">Active user plan distribution</p>
          </div>
          
          <div className="h-40 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {planMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} users`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-primary leading-none">
                {planMixData.reduce((s, d) => s + d.value, 0)}
              </span>
              <span className="text-[9px] text-on-surface-variant font-bold uppercase mt-0.5">Total Users</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-0.5 text-center text-[10px] pt-2 border-t border-outline-variant/30 font-semibold">
            {planMixData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] text-on-surface truncate max-w-[55px]">{item.name.replace(' (Free)', '').replace(' Plan', '')}</span>
                </div>
                <span className="font-black text-primary">{item.value}</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Application status + Essay trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Application Status Breakdown */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs">
          <h4 className="font-display font-black text-primary text-sm mb-3">Application Status</h4>
          {Object.keys(appStatusBreakdown).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(appStatusBreakdown).map(([status, count]) => {
                const total = Object.values(appStatusBreakdown).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round((count / total) * 100);
                const barColor = 
                  status === 'approved' || status === 'accepted' ? 'bg-status-success' :
                  status === 'pending' || status === 'review' ? 'bg-status-warning' :
                  status === 'rejected' ? 'bg-status-error' : 'bg-primary';
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-on-surface w-20 capitalize">{status}</span>
                    <div className="flex-1 h-4 bg-surface-container rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">No application data yet.</p>
          )}
        </div>

        {/* Essay Trend (Last 7 Days) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs">
          <h4 className="font-display font-black text-primary text-sm mb-3">Essays Created (Last 7 Days)</h4>
          {essayChart.length > 0 ? (
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={essayChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#747780' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="essays" stroke="#006c49" strokeWidth={2} dot={{ r: 3, fill: '#006c49' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">No essay activity yet.</p>
          )}
        </div>

      </div>

      {/* Bottom recent ingestions list */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/60">
          <div>
            <h4 className="font-display font-black text-primary text-sm">Recent Ingestions reviewed</h4>
            <p className="text-[10px] text-on-surface-variant">Last crawler ingestions captured by automated agent scripts</p>
          </div>
          <button 
            onClick={() => onNavigateToTab('bot_queue')}
            className="text-xs text-secondary hover:text-on-secondary-fixed flex items-center gap-1 font-bold cursor-pointer"
          >
            View All Ingestions
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/50 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-3.5">Scholarship Name</th>
                <th className="px-6 py-3.5">Source</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-on-surface/90">
              {recentBotQueues.length > 0 ? recentBotQueues.slice(0, 5).map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{item.scholarshipName || item.title || 'Unknown'}</td>
                  <td className="px-6 py-4 font-mono text-outline">{item.sourceUrl?.replace(/https?:\/\//, '').split('/')[0] || item.source || 'N/A'}</td>
                  <td className="px-6 py-4 font-semibold">{item.amount || '—'}</td>
                  <td className="px-6 py-4">
                    {item.status === 'approved' || item.status === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-status-success/10 text-status-success border border-status-success/20">Active</span>
                    ) : item.status === 'pending' || item.status === 'review' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-status-warning/10 text-status-warning border border-status-warning/20">Pending Review</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-status-error/10 text-status-error border border-status-error/20">{item.status || 'Unknown'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => onNavigateToTab('bot_queue')} className="text-secondary hover:underline font-bold cursor-pointer">Review</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant text-xs">
                    No recent ingestions. Run the bot scout to discover scholarships.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
