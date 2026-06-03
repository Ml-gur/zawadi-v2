import React, { useState } from 'react';
import { Search, Download, Calendar, ShieldAlert, ArrowDownWideNarrow, ListFilter } from 'lucide-react';

interface AuditLogItemType {
  id: string;
  created_at: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address: string;
}

interface AuditTrailProps {
  auditLogsList: AuditLogItemType[];
}

export default function AuditTrail({
  auditLogsList
}: AuditTrailProps) {

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = auditLogsList.filter(l => {
    const matchesSearch = 
      l.admin_email.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.target_id.toLowerCase().includes(search.toLowerCase());

    const matchesAction = filterAction === 'all' || l.action.toLowerCase().includes(filterAction.toLowerCase());

    return matchesSearch && matchesAction;
  });

  // Export audit logs to CSV
  const handleExportAuditCSV = () => {
    const headers = ['Timestamp', 'Admin Operator', 'Action Type', 'Target Entity', 'Change Details', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.created_at, l.admin_email, l.action, l.target_type, l.details, l.ip_address
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zawadi_security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-sweep">
      
      {/* Title & oversight banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="font-display text-lg font-black text-primary flex items-center gap-2">
            Immutable Security Audit Trial Logs
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Cryptographically chronological records of metadata actions taken by operators, billing portals, and automated crawling services.
          </p>
        </div>
        
        <button 
          onClick={handleExportAuditCSV}
          className="bg-primary hover:bg-primary-container text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs border border-primary-fixed/10"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Log
        </button>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3.5 top-2.5" />
          <input 
            type="text"
            placeholder="Search security trail by query name, details or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low text-on-surface text-xs pl-10 pr-4 py-2 rounded-xl border border-outline-variant/20 focus:border-primary/50 outline-none"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
          >
            <option value="all">All Action Categories</option>
            <option value="create">Created Event</option>
            <option value="update">Updated Event</option>
            <option value="delete">Deleted Event</option>
            <option value="suspend">Suspended Profile</option>
            <option value="import">Imported / Ingestion</option>
          </select>
        </div>

      </div>

      {/* Audit logs ledger table */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/50 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Admin Operator</th>
                <th className="px-6 py-3.5">Action Category</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Change Metadata Info</th>
                <th className="px-6 py-3.5">Host IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-on-surface/90 font-medium">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-[10px] text-on-surface-variant whitespace-nowrap">{l.created_at}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary-container text-on-primary-fixed font-bold text-[9px] flex items-center justify-center uppercase">
                        {l.admin_email.substring(0, 2)}
                      </div>
                      <span className="font-bold text-primary">{l.admin_email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      l.action.toLowerCase().includes('create') ? 'bg-status-success/10 border-status-success/20 text-status-success' :
                      l.action.toLowerCase().includes('delete') ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent' :
                      l.action.toLowerCase().includes('suspend') ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' :
                      'bg-status-info/10 border-status-info/20 text-status-info'
                    }`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] font-bold text-secondary uppercase bg-secondary-container/10 px-1.5 py-0.5 rounded border border-secondary/20 block text-center truncate max-w-[110px]">
                      {l.target_id}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-light text-on-surface-variant truncate max-w-[280px]" title={l.details}>
                    {l.details}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-outline">{l.ip_address}</td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-outline">
                    No matching security log sheets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-low px-6 py-3 text-[10px] text-on-surface-variant font-semibold select-none flex justify-between items-center border-t border-outline-variant/40">
          <span>Showing 1 to {filteredLogs.length} of {auditLogsList.length} security entries</span>
        </div>
      </div>

    </div>
  );
}
