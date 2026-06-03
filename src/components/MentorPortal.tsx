import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, AlertTriangle, Star, User, BookOpen,
  FileText, ArrowLeft, Send, Plus, X, MessageSquare,
  GraduationCap, Globe, Calendar, ChevronRight, RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MENTOR_REVIEW_LIMITS, PLAN_LABELS } from '../config/plan-config';

interface MentorPortalProps {
  user: any;
  onBack: () => void;
}

interface QueueItem {
  id: string;
  request_reference: string;
  scholarship_name: string;
  scholarship_provider: string;
  user_first_name: string;
  user_country: string;
  user_plan: string;
  essay_content: string;
  essay_type?: string;
  response_deadline: string;
  feedback_type?: string;
  scholarship_region?: string;
  scholarship_deadline?: string;
  status: string;
  created_at?: string;
  submitted_at?: string;
  admin_approved?: boolean;
  student_rating?: number;
  mentor_notes?: string;
}

interface ReviewFeedback {
  overall_assessment: string;
  general_advice: string;
  confidence_score: number;
  opening_feedback: string;
  narrative_feedback: string;
  evidence_feedback: string;
  cultural_authenticity_feedback: string;
  closing_feedback: string;
  revised_sections: { section: string; content: string }[];
  success_probability: number;
  strategy_session_notes: string;
  private_notes: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

const invokeMentor = async (action: string, body: any = {}) => {
  const { data, error } = await supabase.functions.invoke('mentor-review', { body: { action, ...body } });
  if (error) return null;
  if (data?.error) return null;
  return data;
};

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const target = new Date(deadline).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('Overdue');
        setUrgent(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setUrgent(hours < 24);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else {
        setTimeLeft(`${hours}h ${mins}m`);
      }
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${urgent ? 'text-status-urgent' : 'text-on-surface-variant'}`}>
      <Clock className="w-3 h-3" />
      {timeLeft}
    </span>
  );
}

function ParagraphEssay({ content, highlighted, onToggle }: { content: string; highlighted: Set<number>; onToggle: (idx: number) => void }) {
  const paragraphs = content.split('\n').filter(p => p.trim());
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <div
          key={i}
          onClick={() => onToggle(i)}
          className={`p-3 rounded-xl border cursor-pointer transition-colors text-sm leading-relaxed ${
            highlighted.has(i)
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-100'
              : 'bg-surface-container-low border-outline-variant/30 hover:border-primary/30'
          }`}
        >
          <span className="text-[10px] font-bold text-outline mr-2 select-none">[{i + 1}]</span>
          {p}
        </div>
      ))}
    </div>
  );
}

function StarRating({ value, onChange, max = 5 }: { value: number; onChange?: (v: number) => void; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i + 1)}
          className={`p-0.5 transition-colors cursor-pointer ${i < value ? 'text-amber-400' : 'text-outline/40 hover:text-amber-300'}`}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  );
}

function RevisedSectionsBuilder({ sections, onChange }: {
  sections: { section: string; content: string }[];
  onChange: (s: { section: string; content: string }[]) => void;
}) {
  const addSection = () => onChange([...sections, { section: '', content: '' }]);
  const removeSection = (i: number) => onChange(sections.filter((_, idx) => idx !== i));
  const updateSection = (i: number, key: 'section' | 'content', val: string) => {
    const updated = sections.map((s, idx) => idx === i ? { ...s, [key]: val } : s);
    onChange(updated);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-on-surface-variant uppercase">Revised Sections</label>
        <button
          type="button"
          onClick={addSection}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-fixed py-1 px-2 rounded-lg hover:bg-primary/5 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Add Section
        </button>
      </div>
      {sections.map((sec, i) => (
        <div key={i} className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <input
              value={sec.section}
              onChange={e => updateSection(i, 'section', e.target.value)}
              placeholder="Section title (e.g. Introduction)"
              className="flex-1 text-xs bg-surface border border-outline-variant/40 rounded-lg px-3 py-1.5 outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => removeSection(i)}
              className="p-1 text-on-surface-variant hover:text-error cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={sec.content}
            onChange={e => updateSection(i, 'content', e.target.value)}
            placeholder="Revised content..."
            rows={4}
            className="w-full text-xs bg-surface border border-outline-variant/40 rounded-lg px-3 py-2 outline-none focus:border-primary resize-y"
          />
        </div>
      ))}
    </div>
  );
}

export default function MentorPortal({ user, onBack }: MentorPortalProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'under_review' | 'completed' | 'profile'>('queue');
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [activeReview, setActiveReview] = useState<QueueItem | null>(null);
  const [highlightedParagraphs, setHighlightedParagraphs] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const plan = user?.plan || 'explorer';
  const planLimits = MENTOR_REVIEW_LIMITS[plan] || MENTOR_REVIEW_LIMITS.explorer;
  const feedbackType = planLimits.feedback_type;

  const [feedback, setFeedback] = useState<ReviewFeedback>({
    overall_assessment: '',
    general_advice: '',
    confidence_score: 0,
    opening_feedback: '',
    narrative_feedback: '',
    evidence_feedback: '',
    cultural_authenticity_feedback: '',
    closing_feedback: '',
    revised_sections: [],
    success_probability: 0,
    strategy_session_notes: '',
    private_notes: '',
  });

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await invokeMentor('my-queue');
      if (data) {
        setQueueItems(data);
      } else {
        setError('Failed to load queue');
      }
    } catch {
      setError('Network error loading queue');
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', user?.email)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          title: n.type || 'Notification',
          message: n.message || '',
          created_at: n.created_at,
        })));
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchNotifications();
  }, []);

  const queue = queueItems.filter(i => i.status === 'assigned');
  const underReview = queueItems.filter(i => i.status === 'under_review');
  const completed = queueItems.filter(i => i.status === 'submitted_by_mentor' || i.status === 'delivered_to_student');

  const handleBeginReview = async (item: QueueItem) => {
    try {
      const data = await invokeMentor('start-review', { request_id: item.id });
      if (!data) return;
      setQueueItems(prev => prev.map(q => q.id === item.id ? { ...q, ...data, status: 'under_review' } : q));
      setActiveReview({ ...item, ...data, status: 'under_review' });
      setFeedback({
        overall_assessment: '',
        general_advice: '',
        confidence_score: 0,
        opening_feedback: '',
        narrative_feedback: '',
        evidence_feedback: '',
        cultural_authenticity_feedback: '',
        closing_feedback: '',
        revised_sections: [],
        success_probability: 0,
        strategy_session_notes: '',
        private_notes: '',
      });
      setHighlightedParagraphs(new Set());
      setValidationErrors([]);
    } catch {
      // silently fail
    }
  };

  const handleContinueReview = (item: QueueItem) => {
    setActiveReview(item);
    setHighlightedParagraphs(new Set());
    setValidationErrors([]);
  };

  const toggleParagraph = (idx: number) => {
    setHighlightedParagraphs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const validateFeedback = (): string[] => {
    const errors: string[] = [];
    if (!feedback.overall_assessment) errors.push('Overall Assessment is required');
    if (feedback.general_advice.length < 100) errors.push('General Advice must be at least 100 characters');
    if (feedback.confidence_score === 0) errors.push('Confidence Score is required');

    if (feedbackType === 'structured' || feedbackType === 'full' || feedbackType === 'full_plus') {
      if (feedback.opening_feedback.length < 30) errors.push('Opening feedback must be at least 30 characters');
      if (feedback.narrative_feedback.length < 30) errors.push('Narrative feedback must be at least 30 characters');
      if (feedback.evidence_feedback.length < 30) errors.push('Evidence feedback must be at least 30 characters');
      if (feedback.cultural_authenticity_feedback.length < 30) errors.push('Cultural Authenticity feedback must be at least 30 characters');
      if (feedback.closing_feedback.length < 30) errors.push('Closing feedback must be at least 30 characters');
    }

    if (feedbackType === 'full' || feedbackType === 'full_plus') {
      if (feedback.success_probability === 0) errors.push('Estimated Success Probability is required');
    }

    return errors;
  };

  const handleSubmitReview = async () => {
    const errors = validateFeedback();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    if (!activeReview) return;
    setSubmitting(true);
    try {
      const data = await invokeMentor('submit-review', {
        request_id: activeReview.id,
        feedback_overall_assessment: feedback.overall_assessment,
        feedback_opening: feedback.opening_feedback,
        feedback_narrative: feedback.narrative_feedback,
        feedback_evidence: feedback.evidence_feedback,
        feedback_cultural_authenticity: feedback.cultural_authenticity_feedback,
        feedback_closing: feedback.closing_feedback,
        feedback_general_advice: feedback.general_advice,
        revised_sections: feedback.revised_sections,
        mentor_confidence_score: feedback.confidence_score,
        estimated_success_probability: feedback.success_probability,
        mentor_private_notes: feedback.private_notes,
      });
      if (data) {
        await fetchQueue();
        setActiveReview(null);
      } else {
        setValidationErrors(['Failed to submit review']);
      }
    } catch {
      setValidationErrors(['Failed to submit review']);
    }
    setSubmitting(false);
  };

  const handleNotificationRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      // silently fail
    }
  };

  const renderQueueCard = (item: QueueItem, buttonLabel: string, onClick: () => void) => {
    const deadline = new Date(item.response_deadline).getTime();
    const isUrgent = deadline - Date.now() < 24 * 60 * 60 * 1000;

    return (
      <div
        key={item.id}
        className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-outline bg-surface-container-low px-2 py-0.5 rounded">
                {item.request_reference}
              </span>
              {isUrgent && (
                <span className="flex items-center gap-1 text-[10px] font-black text-white bg-status-urgent px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> URGENT
                </span>
              )}
            </div>
            <h3 className="font-bold text-primary text-sm mt-1 leading-tight">{item.scholarship_name}</h3>
            <p className="text-xs text-on-surface-variant">{item.scholarship_provider}</p>
          </div>
          <CountdownTimer deadline={item.response_deadline} />
        </div>

        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {item.user_first_name}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            {item.user_country}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
            item.user_plan === 'institutional' ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent' :
            item.user_plan === 'pro' ? 'bg-primary/10 border-primary/20 text-primary' :
            item.user_plan === 'plus' ? 'bg-status-info/10 border-status-info/20 text-status-info' :
            'bg-surface-variant/40 border-outline-variant/30 text-on-surface-variant'
          }`}>
            {PLAN_LABELS[item.user_plan] || item.user_plan}
          </span>
        </div>

        <button
          onClick={onClick}
          className="w-full bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:scale-[1.01] active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          {buttonLabel}
        </button>
      </div>
    );
  };

  const completedCard = (item: QueueItem) => (
    <div key={item.id} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-outline bg-surface-container-low px-2 py-0.5 rounded">
            {item.request_reference}
          </span>
          <h3 className="font-bold text-primary text-sm mt-1">{item.scholarship_name}</h3>
          <p className="text-xs text-on-surface-variant">{item.scholarship_provider}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border whitespace-nowrap ${
          item.admin_approved === true
            ? 'bg-status-success/15 border-status-success/25 text-status-success'
            : item.admin_approved === false
            ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent'
            : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
        }`}>
          {item.admin_approved === true ? 'Approved' : item.admin_approved === false ? 'Rejected' : 'Pending'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap">
        {item.submitted_at && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(item.submitted_at).toLocaleDateString()}
          </span>
        )}
        {item.student_rating !== undefined && item.student_rating > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-current" />
            {item.student_rating}/5
          </span>
        )}
      </div>
    </div>
  );

  const tabClass = (tab: string) =>
    `px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
      activeTab === tab
        ? 'bg-secondary-container text-on-secondary-container shadow-xs'
        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
    }`;

  return (
    <div className="space-y-6 animate-sweep">
      {/* Header */}
      <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
            </button>
            <div>
              <h2 className="font-display text-xl font-black text-primary">Mentor Review Portal</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">Review and provide feedback on student essays</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-on-surface-variant" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-urgent text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-outline-variant/30">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase">Notifications</h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-on-surface-variant text-center">No new notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationRead(n.id)}
                        className="p-3 border-b border-outline-variant/20 hover:bg-surface-container cursor-pointer transition-colors"
                      >
                        <p className="text-xs font-bold text-primary">{n.title}</p>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-2 shadow-xs">
        <button onClick={() => setActiveTab('queue')} className={tabClass('queue')}>
          My Queue {queue.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-status-urgent text-white rounded-full text-[9px]">{queue.length}</span>}
        </button>
        <button onClick={() => setActiveTab('under_review')} className={tabClass('under_review')}>
          Under Review {underReview.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-primary text-white rounded-full text-[9px]">{underReview.length}</span>}
        </button>
        <button onClick={() => setActiveTab('completed')} className={tabClass('completed')}>
          Completed
        </button>
        <button onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
          My Profile
        </button>
      </div>

      {/* Content Area */}
      {error && (
        <div className="bg-status-urgent/10 border border-status-urgent/20 rounded-2xl p-4 text-xs text-status-urgent font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={fetchQueue} className="ml-auto flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {(() => {
        if (loading) {
          return (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          );
        }
        switch (activeTab) {
          case 'queue':
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queue.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-on-surface-variant">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-status-success/50" />
                    <p className="text-sm font-bold text-primary">Queue is clear</p>
                    <p className="text-xs mt-1">No pending review requests assigned to you.</p>
                  </div>
                ) : (
                  queue.map(item => renderQueueCard(item, 'Begin Review', () => handleBeginReview(item)))
                )}
              </div>
            );
          case 'under_review':
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {underReview.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-on-surface-variant">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-outline/50" />
                    <p className="text-sm font-bold text-primary">Nothing in progress</p>
                    <p className="text-xs mt-1">Continue reviewing from your queue.</p>
                  </div>
                ) : (
                  underReview.map(item => renderQueueCard(item, 'Continue Review', () => handleContinueReview(item)))
                )}
              </div>
            );
          case 'completed':
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.length === 0 ? (
                  <div className="col-span-full text-center py-16 text-on-surface-variant">
                    <GraduationCap className="w-12 h-12 mx-auto mb-3 text-outline/50" />
                    <p className="text-sm font-bold text-primary">No completed reviews</p>
                    <p className="text-xs mt-1">Completed reviews will appear here.</p>
                  </div>
                ) : (
                  completed.map(item => completedCard(item))
                )}
              </div>
            );
          case 'profile':
            return (
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-xs space-y-4 max-w-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-black">
              {user.name?.[0] || user.email?.[0] || 'M'}
            </div>
            <div>
              <h3 className="font-black text-primary text-lg">{user.name || 'Mentor'}</h3>
              <p className="text-xs text-on-surface-variant">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-outline font-bold uppercase tracking-wider text-[10px]">Plan</p>
              <p className="font-bold text-primary mt-1">{PLAN_LABELS[plan] || plan}</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-outline font-bold uppercase tracking-wider text-[10px]">Feedback Type</p>
              <p className="font-bold text-primary mt-1 capitalize">{feedbackType.replace('_', ' ')}</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-outline font-bold uppercase tracking-wider text-[10px]">Response Guarantee</p>
              <p className="font-bold text-primary mt-1">{planLimits.response_days_guarantee} day(s)</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="text-outline font-bold uppercase tracking-wider text-[10px]">Reviews / Month</p>
              <p className="font-bold text-primary mt-1">{planLimits.reviews_per_month ?? 'Unlimited'}</p>
            </div>
          </div>
        </div>
      );

      /* close switch/IIFE */
    }
  })()}

      {/* Review Workspace Modal */}
      {activeReview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
          {/* Modal Header */}
          <div className="bg-surface-container-lowest border-b border-outline-variant/60 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveReview(null)}
                className="p-2 border border-outline-variant/40 hover:bg-surface-container rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
              <div>
                <h3 className="font-black text-primary text-sm">{activeReview.scholarship_name}</h3>
                <p className="text-[11px] text-on-surface-variant">
                  {activeReview.request_reference} — {activeReview.user_first_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                activeReview.user_plan === 'institutional' ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent' :
                activeReview.user_plan === 'pro' ? 'bg-primary/10 border-primary/20 text-primary' :
                activeReview.user_plan === 'plus' ? 'bg-status-info/10 border-status-info/20 text-status-info' :
                'bg-surface-variant/40 border-outline-variant/30 text-on-surface-variant'
              }`}>
                {PLAN_LABELS[activeReview.user_plan] || activeReview.user_plan}
              </span>
              <CountdownTimer deadline={activeReview.response_deadline} />
            </div>
          </div>

          {/* Modal Content - 3 Panel Layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Essay Panel */}
            <div className="w-full lg:w-2/5 xl:w-[35%] overflow-y-auto border-r border-outline-variant/30 bg-surface-container-lowest/80">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                    {activeReview.essay_type || 'Student Essay'}
                  </h4>
                </div>
                <ParagraphEssay
                  content={activeReview.essay_content}
                  highlighted={highlightedParagraphs}
                  onToggle={toggleParagraph}
                />
              </div>
            </div>

            {/* Center: Feedback Form */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 max-w-3xl mx-auto space-y-6">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback Form ({feedbackType.replace('_', ' ')})
                </h4>

                {validationErrors.length > 0 && (
                  <div className="bg-status-urgent/10 border border-status-urgent/20 rounded-xl p-3 space-y-1">
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-status-urgent font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Overall Assessment */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Overall Assessment *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'strong_proceed', label: 'Strong — Proceed' },
                      { value: 'good_minor_revisions', label: 'Good — Minor Revisions' },
                      { value: 'needs_work_major_revisions', label: 'Needs Work — Major Revisions' },
                      { value: 'not_ready_rewrite', label: 'Not Ready — Rewrite' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFeedback(prev => ({ ...prev, overall_assessment: opt.value }))}
                        className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          feedback.overall_assessment === opt.value
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:border-primary/30'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* General Advice */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">
                    General Advice * <span className="font-normal text-outline">(min 100 chars)</span>
                  </label>
                  <textarea
                    value={feedback.general_advice}
                    onChange={e => setFeedback(prev => ({ ...prev, general_advice: e.target.value }))}
                    rows={5}
                    className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary resize-y"
                    placeholder="Provide your general assessment and advice for the student..."
                  />
                  <p className="text-[10px] text-right text-outline">{feedback.general_advice.length}/100</p>
                </div>

                {/* Confidence Score */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Confidence Score *</label>
                  <StarRating value={feedback.confidence_score} onChange={v => setFeedback(prev => ({ ...prev, confidence_score: v }))} />
                </div>

                {/* Structured Feedback Sections */}
                {(feedbackType === 'structured' || feedbackType === 'full' || feedbackType === 'full_plus') && (
                  <div className="space-y-4 border-t border-outline-variant/30 pt-4">
                    <h5 className="text-[11px] font-bold text-outline uppercase tracking-wider">Structured Feedback</h5>
                    {[
                      { key: 'opening_feedback', label: 'Opening / Hook' },
                      { key: 'narrative_feedback', label: 'Narrative / Storytelling' },
                      { key: 'evidence_feedback', label: 'Evidence & Examples' },
                      { key: 'cultural_authenticity_feedback', label: 'Cultural Authenticity' },
                      { key: 'closing_feedback', label: 'Closing / Conclusion' },
                    ].map(section => (
                      <div key={section.key} className="space-y-2">
                        <label className="text-xs font-bold text-on-surface-variant uppercase">
                          {section.label} <span className="font-normal text-outline">(min 30 chars)</span>
                        </label>
                        <textarea
                          value={(feedback as any)[section.key]}
                          onChange={e => setFeedback(prev => ({ ...prev, [section.key]: e.target.value }))}
                          rows={4}
                          className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary resize-y"
                          placeholder={`Feedback on ${section.label.toLowerCase()}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Full / Full_Plus Sections */}
                {(feedbackType === 'full' || feedbackType === 'full_plus') && (
                  <div className="space-y-4 border-t border-outline-variant/30 pt-4">
                    <h5 className="text-[11px] font-bold text-outline uppercase tracking-wider">Advanced Review</h5>

                    <RevisedSectionsBuilder
                      sections={feedback.revised_sections}
                      onChange={sections => setFeedback(prev => ({ ...prev, revised_sections: sections }))}
                    />

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-on-surface-variant uppercase">Estimated Success Probability *</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={feedback.success_probability}
                          onChange={e => setFeedback(prev => ({ ...prev, success_probability: parseInt(e.target.value) }))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-xs font-bold text-primary w-10 text-right">{feedback.success_probability}%</span>
                      </div>
                    </div>

                    {feedbackType === 'full_plus' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-on-surface-variant uppercase">Strategy Session Notes</label>
                        <textarea
                          value={feedback.strategy_session_notes}
                          onChange={e => setFeedback(prev => ({ ...prev, strategy_session_notes: e.target.value }))}
                          rows={4}
                          className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary resize-y"
                          placeholder="Notes from strategy session..."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Private Notes */}
                <div className="space-y-2 border-t border-outline-variant/30 pt-4">
                  <label className="text-xs font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Private Notes
                  </label>
                  <textarea
                    value={feedback.private_notes}
                    onChange={e => setFeedback(prev => ({ ...prev, private_notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary resize-y"
                    placeholder="Private notes (not visible to student)..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary-container text-white text-sm font-bold py-3 px-6 rounded-xl transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {submitting ? 'Submitting...' : 'Submit for Admin Review'}
                </button>
              </div>
            </div>

            {/* Right: Scholarship Context Panel */}
            <div className="w-full lg:w-72 xl:w-80 overflow-y-auto border-l border-outline-variant/30 bg-surface-container-lowest/80">
              <div className="p-4 space-y-4">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Scholarship Context
                </h4>

                <div className="bg-surface-container-low rounded-xl p-3 space-y-3">
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Scholarship</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{activeReview.scholarship_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Provider</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{activeReview.scholarship_provider}</p>
                  </div>
                  {activeReview.scholarship_region && (
                    <div>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Region</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{activeReview.scholarship_region}</p>
                    </div>
                  )}
                  {activeReview.scholarship_deadline && (
                    <div>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Scholarship Deadline</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{new Date(activeReview.scholarship_deadline).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Student</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{activeReview.user_first_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Country</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{activeReview.user_country}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Plan</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black border ${
                      activeReview.user_plan === 'institutional' ? 'bg-status-urgent/10 border-status-urgent/20 text-status-urgent' :
                      activeReview.user_plan === 'pro' ? 'bg-primary/10 border-primary/20 text-primary' :
                      activeReview.user_plan === 'plus' ? 'bg-status-info/10 border-status-info/20 text-status-info' :
                      'bg-surface-variant/40 border-outline-variant/30 text-on-surface-variant'
                    }`}>
                      {PLAN_LABELS[activeReview.user_plan] || activeReview.user_plan}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider">Response Deadline</p>
                    <p className="text-xs font-bold text-primary mt-0.5">
                      {new Date(activeReview.response_deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
