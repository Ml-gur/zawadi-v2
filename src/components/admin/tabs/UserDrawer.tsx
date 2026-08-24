import { useState } from 'react';
import toast from 'react-hot-toast';
import { Ban, CheckCircle2, Trash2, Mail } from 'lucide-react';
import { AdminUserProfile, UserEngagement, callAdminApi } from '../../../lib/admin-api';
import { Drawer } from '../ui/Drawer';
import ConfirmationDialog from '../../ConfirmationDialog';

interface UserDrawerProps {
  user: AdminUserProfile | null;
  onClose: () => void;
  onChanged: () => void;
}

const MVSP_FIELDS = ['degree_level', 'field_of_study', 'gpa', 'date_of_birth', 'country'] as const;

export function UserDrawer({ user, onClose, onChanged }: UserDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;

  const engagement: UserEngagement | undefined = (user as { engagement?: UserEngagement }).engagement;
  const completeness = MVSP_FIELDS.filter((f) => {
    const v = user[f];
    return v !== null && v !== undefined && v !== '';
  }).length;

  const mutate = async (action: string, params: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      await callAdminApi(action, params);
      toast.success(successMsg);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={Boolean(user)} onClose={onClose} title="Scholar profile">
      <div className="flex items-center gap-4 mb-6">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-parchment text-off-black-ink text-sm font-medium uppercase" aria-hidden>
          {(user.name || user.email).substring(0, 2)}
        </span>
        <div className="min-w-0">
          <h4 className="text-ed-sub font-medium text-off-black-ink tracking-tight truncate">{user.name || user.email.split('@')[0]}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="bg-parchment text-graphite text-[10px] font-medium uppercase px-2 py-0.5 rounded-full">{user.plan}</span>
            <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-electric-lime text-off-black-ink' : 'bg-error/10 text-error'}`}>{user.status}</span>
          </div>
        </div>
      </div>

      <dl className="bg-parchment rounded-lg p-4 space-y-2.5 text-ed-body-sm mb-6">
        <div className="flex justify-between gap-3">
          <dt className="text-graphite">Email</dt>
          <dd className="font-medium text-off-black-ink truncate font-mono text-[12px]">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-graphite">Country</dt>
          <dd className="font-medium text-off-black-ink">{user.country || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-graphite">Joined</dt>
          <dd className="font-medium text-off-black-ink">{user.created_at ? new Date(user.created_at).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-graphite">Profile completeness</dt>
          <dd className="font-medium text-off-black-ink tabular-nums">{completeness}/{MVSP_FIELDS.length} key fields</dd>
        </div>
      </dl>

      <p className="text-ed-eyebrow uppercase text-graphite mb-3">Platform activity</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Tracked', value: engagement?.applications ?? 0 },
          { label: 'Documents', value: engagement?.documents ?? 0 },
          { label: 'Essays', value: engagement?.essays ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-pure-white border border-ash rounded-lg p-3 text-center">
            <p className="text-ed-sub font-medium text-off-black-ink tabular-nums">{value}</p>
            <p className="text-[10px] uppercase tracking-wider text-graphite mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {engagement && (
        <p className="text-ed-caption tracking-normal text-graphite mb-6">Vault storage: {engagement.storage}</p>
      )}

      <p className="text-ed-eyebrow uppercase text-graphite mb-3">Account controls</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="drawer-plan" className="text-ed-caption tracking-normal text-graphite block mb-1.5">Plan</label>
          <select
            id="drawer-plan"
            value={user.plan}
            disabled={saving}
            onChange={(e) => mutate('user.update', { email: user.email, plan: e.target.value }, `Plan updated to ${e.target.value}`)}
            className="w-full bg-pure-white border border-ash rounded-lg px-4 min-h-[44px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="explorer">Explorer (free)</option>
            <option value="plus">Scholar Plus</option>
            <option value="pro">Application Pro</option>
            <option value="institutional">Institutional</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => mutate('user.update', { email: user.email, status: user.status === 'active' ? 'suspended' : 'active' }, user.status === 'active' ? 'Account suspended' : 'Account reactivated')}
            disabled={saving}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-4 min-h-[44px] text-ed-body-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              user.status === 'active'
                ? 'border-ash text-graphite hover:text-error hover:border-error'
                : 'bg-electric-lime text-off-black-ink hover:bg-lime-hover'
            }`}
          >
            {user.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {user.status === 'active' ? 'Suspend' : 'Reactivate'}
          </button>
          <a
            href={`mailto:${user.email}?subject=Techsari`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ash px-4 min-h-[44px] text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </a>
        </div>

        <button
          onClick={() => setConfirmDelete(true)}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-error/30 bg-error/5 px-4 min-h-[44px] text-ed-body-sm font-medium text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete account
        </button>
      </div>

      <ConfirmationDialog
        isOpen={confirmDelete}
        title={`Delete ${user.name || user.email}?`}
        message="This permanently removes their profile, tracker, documents and essays. This cannot be undone."
        confirmText="Delete permanently"
        onConfirm={async () => {
          setConfirmDelete(false);
          await mutate('user.delete', { email: user.email }, 'Account deleted');
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Drawer>
  );
}
