import { AdminSectionShell } from '../ui/AdminSectionShell';

export function BotQueueTab() {
  return (
    <AdminSectionShell title="Bot Queue" description="Crawler discoveries awaiting your review — rebuilt in the next pass.">
      <div className="bg-pure-white border border-ash rounded-ed py-16 text-center text-ed-body-sm text-graphite">
        Bot queue review loads here.
      </div>
    </AdminSectionShell>
  );
}
