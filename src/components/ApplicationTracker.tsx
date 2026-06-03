import React, { useState } from 'react';
import { Scholarship, ApplicationTracker as TrackerType } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface ApplicationTrackerProps {
  scholarships: Scholarship[];
  applications: TrackerType[];
  onTrackScholarship: (scholarshipId: string, status: string, notes?: string, priority?: any) => void;
  onRemoveTrack: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function ApplicationTracker({
  scholarships,
  applications,
  onTrackScholarship,
  onRemoveTrack,
  onNavigateToTab
}: ApplicationTrackerProps) {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [sortBy, setSortBy] = useState<'none' | 'priority' | 'deadline'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const statuses = [
    "All", "Saved", "Drafting", "Preparing Documents", "Essay Drafting", "Ready to Submit",
    "Applied", "Interview", "Awarded", "Rejected"
  ];

  const getScholarshipName = (id: string) => {
    const s = scholarships.find(s => s.id === id);
    return s ? s.name : "Unknown Scholarship";
  };

  const getScholarshipDeadline = (id: string) => {
    const s = scholarships.find(s => s.id === id);
    return s ? s.deadline : "N/A";
  };

  const getScholarshipSponsor = (id: string) => {
    const s = scholarships.find(s => s.id === id);
    return s ? s.provider : "Global";
  };

  const filteredApps = applications.filter((app) => {
    if (app.status === 'not_started') return false;
    if (filterStatus === 'All') return true;
    return app.status === filterStatus;
  });

  const handleSort = (field: 'priority' | 'deadline') => {
    if (sortBy === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortBy('none');
      }
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedApps = [...filteredApps].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityWeight = { 'High': 3, 'Normal': 2, 'Low': 1 };
      const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
      const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
      return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
    }
    if (sortBy === 'deadline') {
      const deadlineA = getScholarshipDeadline(a.scholarship_id);
      const deadlineB = getScholarshipDeadline(b.scholarship_id);
      
      if (deadlineA === 'N/A' && deadlineB === 'N/A') return 0;
      if (deadlineA === 'N/A') return 1;
      if (deadlineB === 'N/A') return -1;

      const dateA = new Date(deadlineA).getTime();
      const dateB = new Date(deadlineB).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const handleUpdateStatus = (app: TrackerType, nextStatus: string) => {
    onTrackScholarship(app.scholarship_id, nextStatus, app.notes, app.priority);
  };

  const handleUpdatePriority = (app: TrackerType, nextPriority: any) => {
    onTrackScholarship(app.scholarship_id, app.status, app.notes, nextPriority);
  };

  const handleStartEditNotes = (app: TrackerType) => {
    setNoteEditId(app.id);
    setEditingNotes(app.notes);
  };

  const handleSaveNotes = (app: TrackerType) => {
    onTrackScholarship(app.scholarship_id, app.status, editingNotes, app.priority);
    setNoteEditId(null);
  };

  return (
    <div className="space-y-6 animate-sweep">
      
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-black text-primary">Application Tracker pipeline</h2>
        <p className="text-xs text-on-surface-variant mt-0.5">Track your pipeline status, update priority categories or write inline notes.</p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant/50 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-on-surface-variant uppercase mr-2">Filter Stage:</span>
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === st ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-container text-on-surface-variant'}`}
            >
              {st}
            </button>
          ))}
        </div>
        
        {/* Sorting selection drop-down */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-bold text-on-surface-variant uppercase whitespace-nowrap">Sort Pipeline:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [valField, valOrder] = e.target.value.split('-');
              if (valField === 'none') {
                setSortBy('none');
              } else {
                setSortBy(valField as any);
                setSortOrder(valOrder as any);
              }
            }}
            className="text-xs bg-surface border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-primary cursor-pointer font-semibold"
          >
            <option value="none-asc">Default Order</option>
            <option value="priority-desc">Priority: High to Low</option>
            <option value="priority-asc">Priority: Low to High</option>
            <option value="deadline-asc">Deadline: Nearest First</option>
            <option value="deadline-desc">Deadline: Furthest First</option>
          </select>
        </div>
      </div>

      {/* Pipeline List Table container */}
      <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th 
                  onClick={() => handleSort('deadline')}
                  className="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold cursor-pointer select-none hover:bg-surface-container-high transition-colors"
                  title="Click to sort by Scholarship deadline date"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Scholarship / Deadline</span>
                    {sortBy === 'deadline' ? (
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 hover:text-on-surface-variant">unfold_more</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('priority')}
                  className="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold cursor-pointer select-none hover:bg-surface-container-high transition-colors"
                  title="Click to sort by priority levels"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Priority</span>
                    {sortBy === 'priority' ? (
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 hover:text-on-surface-variant">unfold_more</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Tracking Stage</th>
                <th className="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">My Notes</th>
                <th className="py-3.5 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 bg-surface-container-lowest">
              {sortedApps.map((app) => (
                <tr key={app.id} className="hover:bg-surface-container-low/40 transition-colors">
                  
                  {/* Scholarship Name & Sponsor */}
                  <td className="py-4 px-6 min-w-[250px]">
                    <div className="font-bold text-primary truncate max-w-[220px]">
                      {getScholarshipName(app.scholarship_id)}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                      <span>{getScholarshipSponsor(app.scholarship_id)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                        {getScholarshipDeadline(app.scholarship_id)}
                      </span>
                    </div>
                  </td>

                  {/* Priority Pill */}
                  <td className="py-4 px-6">
                    <select
                      value={app.priority}
                      onChange={(e) => handleUpdatePriority(app, e.target.value as any)}
                      className={`text-xs font-bold rounded-lg border px-3 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
                        app.priority === 'High' 
                          ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent' 
                          : app.priority === 'Normal' 
                          ? 'bg-status-info/10 border-status-info/20 text-status-info' 
                          : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                      }`}
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Normal">Normal Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                  </td>

                  {/* Stage Dropdown select */}
                  <td className="py-4 px-6">
                    <select
                      value={app.status}
                      onChange={(e) => handleUpdateStatus(app, e.target.value)}
                      className={`text-xs border rounded-lg p-2 focus:outline-none focus:border-primary cursor-pointer font-bold transition-all ${
                        app.status === 'Applied' 
                          ? 'bg-secondary text-white border-secondary' 
                          : (app.status === 'Drafting' || app.status === 'Essay Drafting')
                          ? 'bg-primary text-white border-primary'
                          : app.status === 'Saved'
                          ? 'bg-secondary/15 text-secondary border-secondary/25 font-black'
                          : 'bg-surface border-outline-variant text-on-surface'
                      }`}
                    >
                      <option value="Saved" className="bg-surface text-secondary font-bold">Saved</option>
                      <option value="Drafting" className="bg-surface text-primary font-bold">Drafting</option>
                      <option value="Preparing Documents" className="bg-surface text-on-surface">Preparing Documents</option>
                      <option value="Essay Drafting" className="bg-surface text-on-surface">Essay Drafting</option>
                      <option value="Ready to Submit" className="bg-surface text-on-surface">Ready to Submit</option>
                      <option value="Applied" className="bg-surface text-secondary font-bold">Applied</option>
                      <option value="Interview" className="bg-surface text-on-surface">Interview</option>
                      <option value="Awarded" className="bg-surface text-on-surface">Awarded</option>
                      <option value="Rejected" className="bg-surface text-on-surface">Rejected</option>
                    </select>
                  </td>

                  {/* Dynamic Notes */}
                  <td className="py-4 px-6 max-w-[300px]">
                    {noteEditId === app.id ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          className="p-1.5 border border-outline-variant rounded text-xs w-full bg-surface"
                          type="text"
                        />
                        <button 
                          onClick={() => handleSaveNotes(app)}
                          className="text-status-success p-1 hover:bg-status-success/10 rounded"
                        >
                          <span className="material-symbols-outlined text-[16px]">done</span>
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleStartEditNotes(app)}
                        className="text-xs text-on-surface-variant truncate text-left hover:underline cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate flex-1 pr-4">{app.notes || "(Click to write first-hand notes)"}</span>
                        <span className="material-symbols-outlined text-[14px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                      </div>
                    )}
                  </td>

                  {/* Action delete trash button */}
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setDeleteConfirmId(app.id)}
                      className="text-on-surface-variant hover:text-status-urgent p-2 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
                      title="Untrack scholarship"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>

                </tr>
              ))}

              {sortedApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <span className="material-symbols-outlined text-4xl text-outline mb-4">analytics</span>
                    <h4 className="font-semibold text-on-surface mb-1">Pipeline is clean</h4>
                    <p className="text-xs text-on-surface-variant mb-4">No active applications currently set in this tracking stage.</p>
                    <button 
                      onClick={() => onNavigateToTab('scholarships')}
                      className="bg-primary text-on-primary text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 cursor-pointer"
                    >
                      Discover Scholarships
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={!!deleteConfirmId}
        title="Remove Scholarship from Tracker"
        message={`Are you sure you want to remove "${(applications.find(a => a.id === deleteConfirmId) ? getScholarshipName(applications.find(a => a.id === deleteConfirmId)!.scholarship_id) : '')}" from your Application Tracker? All tracking progress and notes for this scholarship will be permanently deleted.`}
        confirmText="Yes, Remove"
        cancelText="Keep Tracking"
        type="danger"
        onConfirm={() => {
          if (deleteConfirmId) {
            onRemoveTrack(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

    </div>
  );
}
