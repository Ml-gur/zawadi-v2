import { useEffect, useState } from 'react';
import { callAdminApi, PaymentRow } from '../../../lib/admin-api';
import { DataTable } from '../ui/DataTable';
import { AdminSectionShell } from '../ui/AdminSectionShell';
import { StatCard } from '../ui/StatCard';
import { Wallet, CheckCircle2 } from 'lucide-react';

export function PaymentsTab() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [mrr, setMrr] = useState(0);
  const [successful, setSuccessful] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 30;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callAdminApi<{ payments: PaymentRow[]; total: number; mrr: number }>('payments.list', { page, limit })
      .then((data) => {
        if (cancelled) return;
        setPayments(data.payments);
        setTotal(data.total);
        setMrr(data.mrr);
        setSuccessful(data.payments.filter((p) => p.status === 'success').length);
        setError('');
      })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <AdminSectionShell
      title="Payments"
      description="Every Paystack transaction, synced from the payments ledger."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard label="MRR" value={mrr.toLocaleString()} deltaLabel="from successful payments" icon={Wallet} />
        <StatCard label="Successful on page" value={successful} deltaLabel={`${total} transactions total`} icon={CheckCircle2} />
      </div>

      {error && <p className="mb-4 text-ed-body-sm text-error">{error}</p>}
      <DataTable<PaymentRow>
        columns={[
          { key: 'user_email', header: 'Customer', render: (p) => <span className="font-medium">{p.user_email || '—'}</span> },
          { key: 'plan', header: 'Plan', render: (p) => <span className="uppercase text-[10px] font-medium bg-parchment text-graphite px-2 py-0.5 rounded-full">{p.plan || '—'}</span> },
          { key: 'amount', header: 'Amount', render: (p) => <span className="tabular-nums">{p.amount != null ? p.amount.toLocaleString() : '—'}</span> },
          {
            key: 'status', header: 'Status',
            render: (p) => (
              <span className={`inline-block text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                p.status === 'success' ? 'bg-electric-lime text-off-black-ink'
                  : p.status === 'failed' ? 'bg-error/10 text-error'
                    : 'bg-parchment text-graphite'
              }`}>
                {p.status || 'unknown'}
              </span>
            ),
          },
          { key: 'paystack_reference', header: 'Reference', render: (p) => <span className="font-mono text-[11px] text-graphite">{p.paystack_reference || '—'}</span> },
          {
            key: 'created_at', header: 'Date',
            render: (p) => p.created_at ? new Date(p.created_at).toLocaleDateString([], { dateStyle: 'medium' }) : '—',
          },
        ]}
        rows={payments}
        rowKey={(p) => p.id}
        emptyMessage="No payments recorded yet. Transactions appear the moment Paystack confirms them."
        loading={loading}
      />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-ed-body-sm text-graphite">
          <span>Page {page} of {pages} · {total} transactions</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Previous</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-4 min-h-[40px] rounded-full border border-ash hover:border-graphite hover:text-off-black-ink transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer">Next</button>
          </div>
        </div>
      )}
    </AdminSectionShell>
  );
}
