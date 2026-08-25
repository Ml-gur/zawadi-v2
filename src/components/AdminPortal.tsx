import { useState } from 'react';
import type { FC } from 'react';
import { LayoutDashboard, Users, BookOpen, Bot, CreditCard, ScrollText, Brain, GraduationCap, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Scholarship, BotQueueIngestion, AuditLogItem } from '../types';
import { useAdminData } from '../hooks/useAdminData';
import type { AdminOverview, Timeseries } from '../lib/admin-api';
import { OverviewTab } from './admin/tabs/OverviewTab';
import { UsersTab } from './admin/tabs/UsersTab';
import { ScholarshipsTab } from './admin/tabs/ScholarshipsTab';
import { BotQueueTab } from './admin/tabs/BotQueueTab';
import { PaymentsTab } from './admin/tabs/PaymentsTab';
import { AuditTab } from './admin/tabs/AuditTab';
import { AiConfigTab } from './admin/tabs/AiConfigTab';
import { MentorQueueTab } from './admin/tabs/MentorQueueTab';

export type AdminSection =
  | 'overview' | 'users' | 'scholarships' | 'bot_queue'
  | 'payments' | 'audit' | 'ai_config' | 'mentor_queue';

const SECTIONS: { id: AdminSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'scholarships', label: 'Scholarships', icon: BookOpen },
  { id: 'bot_queue', label: 'Bot Queue', icon: Bot },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'ai_config', label: 'AI Config', icon: Brain },
  { id: 'mentor_queue', label: 'Mentor Queue', icon: GraduationCap },
];

interface AdminPortalProps {
  user: { email?: string; name?: string; role?: string };
  scholarships: Scholarship[];
  botQueue: BotQueueIngestion[];
  auditLogs: AuditLogItem[];
  onAddScholarship: (schol: Partial<Scholarship>) => void;
  onRemoveScholarship: (id: string) => void;
  onBulkRemoveScholarships: (ids: string[]) => void;
  onBulkSetPublished: (ids: string[], published: boolean) => Promise<void>;
  onTogglePublish: (id: string) => Promise<void>;
  onTriggerScrapeCampaign: () => Promise<void>;
  onReviewBotItem: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export default function AdminPortal(props: AdminPortalProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const { overview, timeseries, loading, error, updatedAt, refresh } = useAdminData();

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <nav aria-label="Admin sections" className="lg:w-52 shrink-0">
        <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-6">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <NavButton
              key={id}
              label={label}
              icon={Icon}
              active={section === id}
              badge={badgeFor(id, overview)}
              onSelect={() => setSection(id)}
            />
          ))}
        </div>
      </nav>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <span className="text-ed-eyebrow uppercase text-graphite">Founder Console</span>
            <p className="text-ed-caption tracking-normal text-graphite mt-0.5">
              {updatedAt
                ? `Live · updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Connecting…'}
            </p>
          </div>
          <button
            onClick={() => refresh()}
            aria-label="Refresh data"
            className="icon-btn inline-flex items-center justify-center rounded-full border border-ash text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-error/5 border border-error/20 rounded-ed px-5 py-4 flex items-center justify-between gap-3">
            <p className="text-ed-body-sm text-error">Live data unavailable: {error}</p>
            <button onClick={() => refresh()} className="text-ed-caption uppercase font-medium text-error hover:text-off-black-ink transition-colors cursor-pointer shrink-0">
              Retry
            </button>
          </div>
        )}

        <SectionContent section={section} {...props} overview={overview} timeseries={timeseries} loading={loading} onNavigate={setSection} />
      </div>
    </div>
  );
}

function badgeFor(section: AdminSection, overview: AdminOverview | null): number | null {
  if (!overview) return null;
  if (section === 'bot_queue') return overview.bot_queue.pending || null;
  if (section === 'users') return overview.users.total || null;
  if (section === 'audit') return overview.audit.total || null;
  return null;
}

const NavButton: FC<{ label: string; icon: LucideIcon; active: boolean; badge: number | null; onSelect: () => void }> = ({
  label, icon: Icon, active, badge, onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex lg:w-full items-center gap-2.5 px-4 min-h-[44px] rounded-full lg:rounded-lg text-ed-body-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
        active
          ? 'bg-off-black-ink text-pure-white'
          : 'text-graphite hover:text-off-black-ink hover:bg-mist'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      {label}
      {badge !== null && (
        <span className={`ml-auto inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-[10px] font-medium tabular-nums ${
          active ? 'bg-electric-lime text-off-black-ink' : 'bg-parchment text-graphite'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function SectionContent({
  section, scholarships, botQueue,
  onAddScholarship, onRemoveScholarship, onBulkRemoveScholarships, onBulkSetPublished,
  onTogglePublish, onTriggerScrapeCampaign, onReviewBotItem,
  overview, timeseries, loading, onNavigate,
}: AdminPortalProps & {
  section: AdminSection;
  overview: AdminOverview | null;
  timeseries: Timeseries | null;
  loading: boolean;
  onNavigate: (s: AdminSection) => void;
}) {
  switch (section) {
    case 'users': return <UsersTab />;
    case 'scholarships':
      return (
        <ScholarshipsTab
          scholarships={scholarships}
          onAddScholarship={onAddScholarship}
          onRemoveScholarship={onRemoveScholarship}
          onBulkRemoveScholarships={onBulkRemoveScholarships}
          onBulkSetPublished={onBulkSetPublished}
          onTogglePublish={onTogglePublish}
        />
      );
    case 'bot_queue':
      return <BotQueueTab botQueue={botQueue} onReviewBotItem={onReviewBotItem} onTriggerScrapeCampaign={onTriggerScrapeCampaign} />;
    case 'payments': return <PaymentsTab />;
    case 'audit': return <AuditTab />;
    case 'ai_config': return <AiConfigTab />;
    case 'mentor_queue': return <MentorQueueTab />;
    default:
      return <OverviewTab overview={overview} timeseries={timeseries} loading={loading} onNavigate={onNavigate} />;
  }
}
