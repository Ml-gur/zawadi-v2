import React, { useState } from 'react';
import { Search, Filter, Mail, Check, X, Download, UserPlus, FileText, Ban, GraduationCap, HardDrive } from 'lucide-react';

interface MockUserType {
  id: string;
  name: string;
  email: string;
  country: string;
  plan: string;
  status: string;
  activity: string;
  joined: string;
  appCount: number;
  essayCount: number;
  docCount: number;
  docSize: string;
}

interface UserManagementProps {
  usersList: MockUserType[];
  onUpdatePlan: (userId: string, newPlan: string) => void;
  onToggleStatus: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserManagement({
  usersList,
  onUpdatePlan,
  onToggleStatus,
  onDeleteUser
}: UserManagementProps) {

  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>(usersList[0]?.id || '');
  
  // Custom states for interactive controls
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const selectedUser = usersList.find(u => u.id === selectedUserId) || usersList[0];

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    
    if (selectedPlanFilter === 'all') return matchesSearch;
    return matchesSearch && u.plan.toLowerCase() === selectedPlanFilter.toLowerCase();
  });

  // Handle plan override
  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (selectedUser) {
      onUpdatePlan(selectedUser.id, e.target.value);
      triggerToast(`Plan successfully updated to ${e.target.value.toUpperCase()}`);
    }
  };

  // Toggle suspension
  const handleToggleSuspension = () => {
    if (selectedUser) {
      onToggleStatus(selectedUser.id);
      triggerToast(`User account status modified`);
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Export current list to CSV
  const handleExportUsers = () => {
    const headers = ['User ID', 'Name', 'Email', 'Country', 'Plan', 'Status', 'Registered Date', 'Applications Count', 'Documents count'];
    const rows = filteredUsers.map(u => [
      u.id, u.name, u.email, u.country, u.plan.toUpperCase(), u.status.toUpperCase(), u.joined, u.appCount, u.docCount
    ].join(','));
    
    const csvContent = 'data:text/csv;charset=utf-8,\ufeff' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zawadi_user_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-sweep">
      
      {/* Visual Toast Notification inside user dashboard */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-primary text-white border border-outline-variant/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-sweep text-xs font-bold">
          <span className="text-secondary">✓</span>
          {showToast}
        </div>
      )}

      {/* Left panel (8 cols or 65% on large screens): Search, filter, table list of users */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* filter bar & heading */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-on-surface-variant/70 absolute left-3.5 top-2.5" />
            <input 
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface text-xs pl-10 pr-4 py-2 rounded-xl border border-outline-variant/20 focus:border-primary/50 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-auto shrink-0">
            <select
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
              className="flex-1 sm:flex-none py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
            >
              <option value="all">All Plans</option>
              <option value="explorer">Explorer</option>
              <option value="plus">Scholar Plus</option>
              <option value="pro">Application Pro</option>
              <option value="institutional">Institutional</option>
            </select>
            <button 
              onClick={handleExportUsers}
              className="bg-primary hover:bg-primary-container text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs border border-primary-fixed/10"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* User list grid table container */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/50 font-bold uppercase tracking-wider text-[9px]">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Plan & Status</th>
                  <th className="px-5 py-3">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface/90">
                {filteredUsers.map((u) => {
                  const isActive = u.id === selectedUserId;
                  return (
                    <tr 
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`cursor-pointer transition-colors ${isActive ? 'bg-secondary-container/20 hover:bg-secondary-container/25 border-l-4 border-secondary' : 'hover:bg-surface-container-low/30'}`}
                    >
                      <td className="px-5 py-3.5 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-fixed font-black text-xs flex items-center justify-center uppercase shadow-xs">
                            {u.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-primary group-hover:text-secondary">{u.name}</p>
                            <p className="text-[10px] text-on-surface-variant font-light">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-on-surface">{u.country}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="uppercase font-black text-[9px] text-primary">{u.plan}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                            u.status === 'active' ? 'bg-status-success/15 text-status-success border border-status-success/10' :
                            u.status === 'past_due' ? 'bg-status-warning/15 text-status-warning border border-status-warning/10' :
                            'bg-status-urgent/15 text-status-urgent border border-status-urgent/10'
                          }`}>
                            {u.status.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-light text-on-surface-variant truncate max-w-[200px]">{u.activity}</td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-outline">
                      No registered users match search queries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-low px-5 py-3 text-[10px] text-on-surface-variant font-semibold select-none flex justify-between items-center border-t border-outline-variant/40">
            <span>Showing 1 to {filteredUsers.length} of {usersList.length} users</span>
          </div>
        </div>

      </div>

      {/* Right User detail card (4 cols or ~35% on screens lg) */}
      <div className="lg:col-span-4">
        {selectedUser ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-md overflow-hidden flex flex-col justify-between p-5 space-y-6 sticky top-4">
            
            {/* Header with avatar photo & msg button */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm uppercase shadow-md">
                  {selectedUser.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-display font-black text-primary leading-tight text-base mt-0.5">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="bg-secondary-container text-on-secondary-container uppercase font-extrabold text-[8px] px-1.5 py-0.5 rounded">
                      {selectedUser.plan}
                    </span>
                    <span className="text-[10px] text-outline">📍 {selectedUser.country}</span>
                  </div>
                </div>
              </div>

              {/* Message button */}
              <a 
                href={`mailto:${selectedUser.email}?subject=Zawadi%20Support%20Oversight`}
                className="p-2 border border-outline-variant bg-surface hover:bg-surface-container hover:text-primary transition-all rounded-xl text-on-surface-variant"
                title="Email User"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>

            {/* User Meta specifications list */}
            <div className="bg-background border border-outline-variant/60 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">Email</span>
                <span className="font-semibold text-primary font-mono">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">Joined Date</span>
                <span className="font-semibold text-on-surface">{selectedUser.joined}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">Unique ID</span>
                <span className="font-extrabold font-mono text-secondary text-[10px] uppercase">{selectedUser.id}</span>
              </div>
            </div>

            {/* Platform usage grid cards */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Platform Analytics Usage</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-primary">{selectedUser.appCount}</p>
                  <p className="text-[9px] text-on-surface-variant font-bold uppercase mt-0.5">Tracked Apps</p>
                </div>
                <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-primary">{selectedUser.essayCount}</p>
                  <p className="text-[9px] text-on-surface-variant font-bold uppercase mt-0.5">Essays Generated</p>
                </div>
              </div>
              
              {/* Document stats */}
              <div className="bg-surface-container border border-outline-variant/50 rounded-xl p-3 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">📂</span>
                  <div>
                    <p className="text-xs font-bold text-primary">{selectedUser.docCount} Documents stored</p>
                    <p className="text-[9px] text-on-surface-variant font-medium">in client digital folders</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-outline font-bold">{selectedUser.docSize}</span>
              </div>
            </div>

            {/* Interactive overrides panel */}
            <hr className="border-outline-variant/70" />
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Administrative overrides</span>
              
              {/* Plan dropdown switcher */}
              <div>
                <label className="text-[9px] font-bold text-on-surface-variant uppercase block mb-1">Manual Plan Tier Ajust</label>
                <select 
                  value={selectedUser.plan}
                  onChange={handlePlanChange}
                  className="w-full py-2 px-3 bg-surface border border-outline-variant text-xs font-bold rounded-xl outline-none focus:border-primary"
                >
                  <option value="explorer">Explorer (Free)</option>
                  <option value="plus">Scholar Plus ($5/mo)</option>
                  <option value="pro">Application Pro ($12/mo)</option>
                  <option value="institutional">Institutional (Custom)</option>
                </select>
              </div>

              {/* Bottom buttons action toggler */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={handleToggleSuspension}
                  className={`py-2 px-3 text-[10px] font-bold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${selectedUser.status === 'active' ? 'bg-status-warning/10 border-status-warning/30 text-status-warning hover:bg-status-warning/15' : 'bg-status-success/10 border-status-success/30 text-status-success hover:bg-status-success/15'}`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {selectedUser.status === 'active' ? 'Suspend Account' : 'Reactivate User'}
                </button>
                <button 
                  onClick={() => {
                    const confirm = window.confirm(`Permanently terminate permissions for ${selectedUser.name}? All vaults and trackers will be hard cascading pruned.`);
                    if(confirm) {
                      onDeleteUser(selectedUser.id);
                      triggerToast('User registration file hard-purged.');
                    }
                  }}
                  className="py-2 px-3 text-[10px] font-bold rounded-xl border border-error/30 bg-error/5 hover:bg-error/10 text-error flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>🗑</span>
                  Delete profile
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs py-12 text-center text-outline text-xs">
            Select a candidate profile from the left directory to audit logs details.
          </div>
        )}
      </div>

    </div>
  );
}
