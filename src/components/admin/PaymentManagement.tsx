import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';

interface PaymentTxType {
  id: string;
  name: string;
  email: string;
  plan: string;
  amount: number;
  currency: string;
  created_at: string;
  status: string;
}

interface PaymentManagementProps {
  paymentsList: PaymentTxType[];
}

export default function PaymentManagement({
  paymentsList
}: PaymentManagementProps) {

  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Live billing metrics derived from the actual transactions ledger
  const successfulTxs = paymentsList.filter(p => p.status === 'success');
  const totalRevenue = successfulTxs.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeSubscribers = new Set(successfulTxs.map(p => p.email)).size;
  const successRate = paymentsList.length > 0
    ? ((successfulTxs.length / paymentsList.length) * 100).toFixed(1)
    : null;
  const revenueCurrency = successfulTxs[0]?.currency || '';

  const filteredTxs = paymentsList.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    const matchesPlan = filterPlan === 'all' || p.plan.toLowerCase().includes(filterPlan.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Export payments ledger to CSV
  const handleExportPaymentsCSV = () => {
    const headers = ['Transaction ID', 'Student Name', 'Student Email', 'Plan Name', 'Amount Paid', 'Currency', 'Timestamp', 'Status'];
    const rows = filteredTxs.map(p => [
      p.id, p.name, p.email, p.plan, p.amount, p.currency, p.created_at, p.status.toUpperCase()
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zawadi_mrr_revenue_billing_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-sweep">
      
      {/* Top billing dashboard Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Dynamic total revenue card */}
        <div className="bg-off-black border border-hairline rounded-lg p-4">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">Total Revenue</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-cream">
            {successfulTxs.length > 0 ? `$${totalRevenue.toLocaleString()} ${revenueCurrency}`.trim() : '—'}
          </p>
          <p className="text-[9px] text-muted mt-1">Successful payments in ledger</p>
        </div>

        {/* Active paid subscribers */}
        <div className="bg-off-black border border-hairline rounded-lg p-4">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">Active paid subscribers</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-accent-green">{activeSubscribers}</p>
          <p className="text-[9px] text-muted mt-1">Unique payees with successful payments</p>
        </div>

        {/* Churn rate — not tracked yet */}
        <div className="bg-off-black border border-hairline rounded-lg p-4">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">Churn Rate (30D)</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-cream">—</p>
          <p className="text-[9px] text-muted mt-1">Not tracked from payment records</p>
        </div>

        {/* Successful transaction rate */}
        <div className="bg-off-black border border-hairline rounded-lg p-4">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">Success Transaction rate</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-status-success">{successRate !== null ? `${successRate}%` : '—'}</p>
          <p className="text-[9px] text-muted mt-1">{paymentsList.length} recorded transaction{paymentsList.length === 1 ? '' : 's'}</p>
        </div>

      </div>

      {/* Filter and search parameters */}
      <div className="bg-off-black border border-hairline rounded-lg p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search transactions, payees or email details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-lg text-cream placeholder:text-muted text-xs pl-10 pr-4 py-2 focus:border-accent-green outline-none"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="py-2 px-3 bg-canvas border border-hairline rounded-lg text-xs font-semibold text-cream outline-none focus:border-accent-green"
          >
            <option value="all">All Plan Tiers</option>
            <option value="plus">Scholar Plus ($5/mo)</option>
            <option value="pro">Application Pro ($12/mo)</option>
            <option value="institutional">Institutional</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-2 px-3 bg-canvas border border-hairline rounded-lg text-xs font-semibold text-cream outline-none focus:border-accent-green"
          >
            <option value="all">All States</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button 
            onClick={handleExportPaymentsCSV}
            className="border border-cream/60 hover:border-cream hover:bg-cream/[0.04] text-cream py-2 px-4 rounded-full text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Ledger
          </button>
        </div>

      </div>

      {/* Payment transactions ledger table */}
      <div className="bg-off-black border border-hairline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 z-10 bg-canvas text-muted uppercase tracking-wider text-xs border-b border-hairline">
                <th className="px-6 py-3.5 font-semibold">Transaction ID</th>
                <th className="px-6 py-3.5 font-semibold">Student Payee Details</th>
                <th className="px-6 py-3.5 font-semibold">Product Subscription Plan</th>
                <th className="px-6 py-3.5 font-semibold">Exchange Amount</th>
                <th className="px-6 py-3.5 font-semibold">Date & Time</th>
                <th className="px-6 py-3.5 font-semibold">Receipt Status</th>
              </tr>
            </thead>
            <tbody className="text-cream/90">
              {filteredTxs.map((tx, idx) => (
                <tr key={tx.id} className={`transition-colors hover:bg-cream/[0.02] ${idx > 0 ? 'border-t border-hairline/40' : ''}`}>
                  <td className="px-6 py-4 font-mono tabular-nums font-semibold text-cream text-[10px] uppercase tracking-wider">{tx.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full border border-hairline text-muted font-mono font-semibold text-[10px] flex items-center justify-center uppercase shrink-0">
                        {(tx.name || '').substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-cream">{tx.name}</p>
                        <p className="text-[9px] text-muted leading-none mt-0.5">{tx.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="uppercase font-bold text-[9px] text-muted">{tx.plan}</span>
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums font-semibold text-cream text-xs">${tx.amount.toFixed(2)} {tx.currency}</td>
                  <td className="px-6 py-4 text-muted font-medium text-[10.5px]">{tx.created_at || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      tx.status === 'success' ? 'border-status-success/40 text-status-success' :
                      tx.status === 'pending' ? 'border-status-warning/40 text-status-warning' :
                      'border-status-urgent/40 text-status-urgent'
                    }`}>
                      {tx.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted">
                    No matching transaction records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-canvas px-6 py-3 text-[10px] text-muted font-semibold select-none flex justify-between items-center border-t border-hairline/40">
          <span>Showing 1 to {filteredTxs.length} of {paymentsList.length} ledger entries</span>
        </div>
      </div>

    </div>
  );
}
