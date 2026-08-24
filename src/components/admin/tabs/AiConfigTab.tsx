import { AdminSectionShell } from '../ui/AdminSectionShell';

export function AiConfigTab() {
  return (
    <AdminSectionShell title="AI Config" description="Provider, model and keys powering essay generation and document analysis.">
      <div className="bg-pure-white border border-ash rounded-ed py-16 text-center text-ed-body-sm text-graphite">
        AI configuration loads here.
      </div>
    </AdminSectionShell>
  );
}
