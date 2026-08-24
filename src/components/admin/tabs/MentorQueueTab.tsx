import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { GraduationCap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AdminSectionShell } from '../ui/AdminSectionShell';
import ConfirmationDialog from '../../ConfirmationDialog';

interface MentorQueueItem {
  id: string;
  user_email?: string;
  essay_type?: string;
  scholarship_name?: string;
  status?: string;
  mentor_email?: string | null;
  [key: string]: unknown;
}

async function invokeMentor(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('mentor-review', { body: { action, ...body } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function MentorQueueTab() {
  const [queue, setQueue] = useState<MentorQueueItem[]>([]);
  const [mentors, setMentors] = useState<{ email: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [queueData, mentorData] = await Promise.all([
        invokeMentor('mentor-queue'),
        invokeMentor('mentor-profiles').catch(() => []),
      ]);
      setQueue(Array.isArray(queueData) ? queueData : []);
      setMentors(Array.isArray(mentorData) ? mentorData : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load mentor queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assign = async (requestId: string, mentorEmail: string) => {
    setBusyId(requestId);
    try {
      await invokeMentor('assign', { request_id: requestId, mentor_email: mentorEmail });
      toast.success('Mentor assigned');
      load();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to assign mentor');
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await invokeMentor('approve-review', { request_id: requestId, admin_approval_notes: 'Approved by admin' });
      toast.success('Review approved and delivered to the student');
      load();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to approve review');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (requestId: string, reason: string) => {
    setBusyId(requestId);
    try {
      await invokeMentor('reject-review', { request_id: requestId, rejection_reason: reason });
      toast.success('Review returned to the mentor for revision');
      load();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to reject review');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminSectionShell
      title="Mentor Queue"
      description="Essay review requests flowing between students and mentors. Assign, approve finished reviews, or send work back."
      actions={
        <button onClick={load} className="px-5 min-h-[44px] rounded-full border border-ash text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer">
          Refresh
        </button>
      }
    >
      {error && <p className="mb-4 text-ed-body-sm text-error">{error}</p>}

      {loading ? (
        <div className="bg-pure-white border border-ash rounded-ed py-16 text-center">
          <span className="inline-block w-5 h-5 border-2 border-graphite border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-pure-white border border-ash rounded-ed py-16 px-6 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-parchment border border-ash mb-4" aria-hidden>
            <GraduationCap className="w-5 h-5 text-graphite" strokeWidth={1.5} />
          </span>
          <p className="text-ed-sub text-off-black-ink">No review requests in the queue.</p>
          <p className="mt-1 text-ed-body-sm text-graphite">Student requests appear here as they arrive.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => (
            <li key={item.id} className="bg-pure-white border border-ash rounded-ed p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-ed-body font-medium text-off-black-ink truncate">
                  {item.scholarship_name || 'Untitled request'}
                </p>
                <p className="mt-1 text-ed-caption tracking-normal text-graphite">
                  {item.user_email || '—'} · {item.essay_type || 'review'} · {item.status || 'pending'}
                  {item.mentor_email ? ` · mentor: ${item.mentor_email}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={item.mentor_email || ''}
                  onChange={(e) => assign(item.id, e.target.value)}
                  disabled={busyId === item.id || mentors.length === 0}
                  aria-label={`Assign mentor for ${item.scholarship_name || 'request'}`}
                  className="bg-pure-white border border-ash rounded-full px-4 min-h-[40px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{mentors.length === 0 ? 'No mentors registered' : 'Assign mentor…'}</option>
                  {mentors.map((m) => (
                    <option key={m.email} value={m.email}>{m.name || m.email}</option>
                  ))}
                </select>
                <button
                  onClick={() => approve(item.id)}
                  disabled={busyId === item.id}
                  className="px-4 min-h-[40px] rounded-full bg-electric-lime text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover transition-colors cursor-pointer disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejectId(item.id)}
                  disabled={busyId === item.id}
                  className="px-4 min-h-[40px] rounded-full border border-ash text-ed-body-sm font-medium text-graphite hover:text-error hover:border-error transition-colors cursor-pointer disabled:opacity-50"
                >
                  Send back
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationDialog
        isOpen={Boolean(rejectId)}
        title="Send this review back?"
        message="The mentor will be asked to revise the review before it reaches the student."
        confirmText="Send back"
        onConfirm={() => { if (rejectId) reject(rejectId, 'Returned by admin for revision'); setRejectId(null); }}
        onCancel={() => setRejectId(null)}
      />
    </AdminSectionShell>
  );
}
