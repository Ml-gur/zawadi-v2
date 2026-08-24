import { AdminSectionShell } from '../ui/AdminSectionShell';

export function MentorQueueTab() {
  return (
    <AdminSectionShell title="Mentor Queue" description="Essay review requests awaiting assignment — rebuilt in the next pass.">
      <div className="bg-pure-white border border-ash rounded-ed py-16 text-center text-ed-body-sm text-graphite">
        Mentor queue loads here.
      </div>
    </AdminSectionShell>
  );
}
