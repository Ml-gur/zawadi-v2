import React, { useState } from 'react';
import { Search, Download } from 'lucide-react';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-off-black border border-hairline rounded-lg p-5">
        <div>
          <h2 className="font-display text-lg font-black text-cream flex items-center gap-2">
            Immutable Security Audit Trial Logs
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Cryptographically chronological records of metadata actions taken by operators, billing portals, and automated crawling services.
          </p>
        </div>
        
        <button 
          onClick={handleExportAuditCSV}
          className="border border-cream/60 hover:border-cream hover:bg-cream/[0.04] text-cream py-2 px-4 rounded-full text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Log
        </button>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-off-black border border-hairline rounded-lg p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search security trail by query name, details or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-canvas border border-hairline rounded-lg text-cream placeholder:text-muted text-xs pl-10 pr-4 py-2 focus:border-accent-green outline-none"
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="py-2 px-3 bg-canvas border border-hairline rounded-lg text-xs font-semibold text-cream outline-none focus:border-accent-green"
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
      <div className="bg-off-black border border-hairline rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="sticky top-0 z-10 bg-canvas text-muted uppercase tracking-wider text-xs border-b border-hairline">
                <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                <th className="px-6 py-3.5 font-semibold">Admin Operator</th>
                <th className="px-6 py-3.5 font-semibold">Action Category</th>
                <th className="px-6 py-3.5 font-semibold">Target Entity</th>
                <th className="px-6 py-3.5 font-semibold">Change Metadata Info</th>
                <th className="px-6 py-3.5 font-semibold">Host IP Address</th>
              </tr>
            </thead>
            <tbody className="text-cream/90 font-medium">
              {filteredLogs.map((l, idx) => (
                <tr key={l.id || idx} className={`transition-colors hover:bg-cream/[0.02] ${idx > 0 ? 'border-t border-hairline/40' : ''}`}>
                  <td className="px-6 py-4 font-mono tabular-nums text-[11px] text-muted whitespace-nowrap">{l.created_at || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {l.admin_email ? (
                        <>
                          <div className="w-6 h-6 rounded-full border border-hairline text-muted font-mono font-semibold text-[9px] flex items-center justify-center uppercase shrink-0">
                            {l.admin_email.substring(0, 2)}
                          </div>
                          <span className="font-semibold text-cream">{l.admin_email}</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      l.action.toLowerCase().includes('create') ? 'border-status-success/40 text-status-success' :
                      l.action.toLowerCase().includes('delete') ? 'border-status-urgent/40 text-status-urgent' :
                      l.action.toLowerCase().includes('suspend') ? 'border-status-warning/40 text-status-warning' :
                      'border-status-info/40 text-status-info'
                    }`}>
                      {l.action || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] font-semibold text-accent-blue uppercase border border-accent-blue/40 px-1.5 py-0.5 rounded block text-center truncate max-w-[110px]">
                      {l.target_id || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted truncate max-w-[280px]" title={l.details}>
                    {l.details || '—'}
                  </td>
                  <td className="px-6 py-4 font-mono tabular-nums text-[10px] text-muted">{l.ip_address || '—'}</td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted">
                    No matching security log sheets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-canvas px-6 py-3 text-[10px] text-muted font-semibold select-none flex justify-between items-center border-t border-hairline/40">
          <span>Showing 1 to {filteredLogs.length} of {auditLogsList.length} security entries</span>
        </div>
      </div>

    </div>
  );
}
