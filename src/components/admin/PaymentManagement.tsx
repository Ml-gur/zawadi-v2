import React, { useState } from 'react';
import { CreditCard, DollarSign, Download, Search, SlidersHorizontal, Calendar, MessageCircle } from 'lucide-react';

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
        
        {/* Dynamic total MRR card */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Total Revenue (MRR)</span>
          <p className="text-2xl font-black text-primary">$42,500 <span className="text-[10px] text-secondary font-bold">↗ +15%</span></p>
          <p className="text-[9px] text-outline mt-1">Based on Paystack recurring active logs</p>
        </div>

        {/* Active subscriptions */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Active paid subscriptions</span>
          <p className="text-2xl font-black text-primary">3,200 <span className="text-[10px] text-secondary font-bold">↗ +8%</span></p>
          <p className="text-[9px] text-outline mt-1">Pro + Mentor review active segments</p>
        </div>

        {/* Voluntary churn rate */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Churn Rate (30D)</span>
          <p className="text-2xl font-black text-error">1.8% <span className="text-[10px] text-emerald-600 font-bold">↘ 0.3% down</span></p>
          <p className="text-[9px] text-outline mt-1">Both voluntary + cancel sub-segments</p>
        </div>

        {/* Successful billing payouts */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Success Transaction rate</span>
          <p className="text-2xl font-black text-status-success">98.4% <span className="text-[10px] text-secondary font-bold">↗ +0.2%</span></p>
          <p className="text-[9px] text-outline mt-1">Processed without manual routing action</p>
        </div>

      </div>

      {/* Filter and search parameters */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3.5 top-2.5" />
          <input 
            type="text"
            placeholder="Search transactions, payees or email details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface text-xs pl-10 pr-4 py-2 rounded-xl border border-outline-variant/20 focus:border-primary/50 outline-none"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
          >
            <option value="all">All Plan Tiers</option>
            <option value="plus">Scholar Plus ($5/mo)</option>
            <option value="pro">Application Pro ($12/mo)</option>
            <option value="institutional">Institutional</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
          >
            <option value="all">All States</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button 
            onClick={handleExportPaymentsCSV}
            className="bg-primary hover:bg-primary-container text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs border border-primary-fixed/10"
          >
            <Download className="w-3.5 h-3.5" />
            Download Ledger
          </button>
        </div>

      </div>

      {/* Payment transactions ledger table */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/50 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Student Payee Details</th>
                <th className="px-6 py-3.5">Product Subscription Plan</th>
                <th className="px-6 py-3.5">Exchange Amount</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Receipt Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-on-surface/90">
              {filteredTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-primary text-[10px] uppercase tracking-wider">{tx.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 rounded-full bg-primary-fixed-dim/20 text-primary font-bold text-[10px] flex items-center justify-center uppercase border border-outline-variant/20">
                        {tx.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{tx.name}</p>
                        <p className="text-[9px] text-on-surface-variant font-light leading-none mt-0.5">{tx.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="uppercase font-black text-[9px] text-primary">{tx.plan}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-on-surface text-xs">${tx.amount.toFixed(2)} {tx.currency}</td>
                  <td className="px-6 py-4 text-on-surface-variant font-medium text-[10.5px]">{tx.created_at}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                      tx.status === 'success' ? 'bg-status-success/10 border-status-success/20 text-status-success' :
                      tx.status === 'pending' ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
                      'bg-status-urgent/10 border-status-urgent/20 text-status-urgent'
                    }`}>
                      {tx.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-outline">
                    No matching Paystack transaction records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-low px-6 py-3 text-[10px] text-on-surface-variant font-semibold select-none flex justify-between items-center border-t border-outline-variant/40">
          <span>Showing 1 to {filteredTxs.length} of {paymentsList.length} ledger sheets</span>
        </div>
      </div>

    </div>
  );
}
