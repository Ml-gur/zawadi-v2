import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Check, ExternalLink, Radar, X } from 'lucide-react';
import type { BotQueueIngestion } from '../../../types';
import { AdminSectionShell } from '../ui/AdminSectionShell';
import ConfirmationDialog from '../../ConfirmationDialog';

interface BotQueueTabProps {
  botQueue: BotQueueIngestion[];
  onReviewBotItem: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
  onTriggerScrapeCampaign: () => Promise<void>;
}

export function BotQueueTab({ botQueue, onReviewBotItem, onTriggerScrapeCampaign }: BotQueueTabProps) {
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const pending = botQueue.filter((b) => b.status === 'pending');
  const reviewed = botQueue.filter((b) => b.status !== 'pending').slice(0, 8);

  const runCampaign = async () => {
    setRunning(true);
    try {
      await onTriggerScrapeCampaign();
      toast.success('Crawler campaign started');
    } catch {
      toast.error('Could not start the crawler campaign');
    } finally {
      setRunning(false);
    }
  };

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      await onReviewBotItem(id, status);
    } catch {
      toast.error('Review failed — try again');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminSectionShell
      title="Bot Queue"
      description="Scholarships discovered by the crawler, ranked by extraction confidence. Approve to move them into your listing manager."
      actions={
        <button
          onClick={runCampaign}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full bg-electric-lime px-5 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          <Radar className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Scanning…' : 'Run crawler campaign'}
        </button>
      }
    >
      {pending.length === 0 ? (
        <div className="bg-pure-white border border-ash rounded-ed py-16 px-6 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-parchment border border-ash mb-4" aria-hidden>
            <Bot className="w-5 h-5 text-graphite" strokeWidth={1.5} />
          </span>
          <p className="text-ed-sub text-off-black-ink">Queue is clear.</p>
          <p className="mt-1 text-ed-body-sm text-graphite">Run a campaign to scan for new opportunities.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((item) => (
            <li key={item.id} className="bg-pure-white border border-ash rounded-ed p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-ed-body font-medium text-off-black-ink truncate">{item.scholarship_name}</p>
                <div className="mt-1 flex items-center gap-2 text-ed-caption tracking-normal text-graphite">
                  <span className="truncate">{item.provider || 'Unknown provider'}</span>
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-off-black-ink transition-colors shrink-0">
                      {new URL(item.source_url).hostname.replace('www.', '')}
                      <ExternalLink className="w-3 h-3" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-graphite tabular-nums" title="Extraction confidence">
                {(parseFloat(item.confidence) * 100).toFixed(0)}% match
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => review(item.id, 'approved')}
                  disabled={busyId === item.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-electric-lime px-4 min-h-[40px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => setRejectId(item.id)}
                  disabled={busyId === item.id}
                  className="inline-flex items-center justify-center rounded-full border border-ash px-4 min-h-[40px] text-ed-body-sm font-medium text-graphite hover:text-error hover:border-error transition-colors cursor-pointer disabled:opacity-50"
                  aria-label={`Reject ${item.scholarship_name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <div className="mt-8">
          <p className="text-ed-eyebrow uppercase text-graphite mb-3">Recently reviewed</p>
          <ul className="divide-y divide-ash bg-pure-white border border-ash rounded-ed px-5">
            {reviewed.map((item) => (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                <span className="text-ed-body-sm text-off-black-ink truncate">{item.scholarship_name}</span>
                <span className={`shrink-0 text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                  item.status === 'approved' ? 'bg-electric-lime text-off-black-ink' : item.status === 'duplicate' ? 'bg-parchment text-graphite' : 'bg-error/10 text-error'
                }`}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(rejectId)}
        title="Reject this discovery?"
        message="It will be marked rejected and excluded from your listing manager."
        confirmText="Reject"
        onConfirm={() => { if (rejectId) review(rejectId, 'rejected'); setRejectId(null); }}
        onCancel={() => setRejectId(null)}
      />
    </AdminSectionShell>
  );
}
