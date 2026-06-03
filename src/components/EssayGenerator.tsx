import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { EssayStudioGeneration } from '../types';

interface EssayGeneratorProps {
  user: any;
  essays: EssayStudioGeneration[];
  scholarships?: any[];
  onGenerateEssay: (
    essayType: string,
    scholarshipName: string,
    prompt: string,
    stage: 'draft' | 'critique' | 'polish',
    previousContent?: string,
    wordCount?: number
  ) => Promise<{ id: string; content: string; remaining_today: number; daily_limit: number }>;
  onNavigateToTab: (tab: string) => void;
  onUploadMetadata: (file: File, docType: string) => void;
}

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  stage?: 'draft' | 'critique' | 'polish';
}

type ConversationStage = 'collecting_info' | 'generating_draft' | 'draft_ready' | 'collecting_feedback' | 'generating_critique' | 'critique_ready' | 'generating_polish' | 'polish_ready';

export default function EssayGenerator({
  user,
  essays,
  scholarships = [],
  onGenerateEssay,
  onNavigateToTab,
  onUploadMetadata
}: EssayGeneratorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: `Hi ${user?.name || 'there'}! I'm your essay coach. Let's craft a compelling scholarship essay together.\n\n**What scholarship or program are you applying for?**` }
  ]);
  const [input, setInput] = useState('');
  const [convStage, setConvStage] = useState<ConversationStage>('collecting_info');
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [displayedText, setDisplayedText] = useState('');
  const [stage, setStage] = useState<'idle' | 'drafting' | 'critiquing' | 'polishing' | 'ready_draft' | 'ready_critique' | 'ready_polish'>('idle');
  const [remainingToday, setRemainingToday] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [currentEssayId, setCurrentEssayId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [critiqueContent, setCritiqueContent] = useState('');
  const [polishedContent, setPolishedContent] = useState('');

  // Collected info
  const [collected, setCollected] = useState({
    scholarshipName: '',
    essayType: 'Personal Statement',
    notes: '',
    wordCount: 500,
  });
  const [collectingStep, setCollectingStep] = useState<'scholarship' | 'essay_type' | 'notes'>('scholarship');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedText]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [convStage]);

  const addMessage = (role: 'ai' | 'user', content: string, stage?: 'draft' | 'critique' | 'polish') => {
    setMessages(prev => [...prev, { role, content, stage }]);
  };

  const streamText = (text: string, speed = 8, onDone?: () => void) => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        const chunk = text.slice(i, i + 4);
        setDisplayedText(prev => prev + chunk);
        i += 4;
      } else {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, speed);
  };

  const handleSendMessage = async () => {
    const msg = input.trim();
    if (!msg) return;
    setInput('');
    addMessage('user', msg);

    if (convStage === 'collecting_info') {
      if (collectingStep === 'scholarship') {
        setCollected(prev => ({ ...prev, scholarshipName: msg }));
        setCollectingStep('essay_type');
        addMessage('ai', `Great choice! **${msg}** is fantastic.\n\nWhat type of essay are you writing? (e.g., Personal Statement, Statement of Purpose, Motivation Letter, Study Plan, Leadership Essay)`);
        return;
      }
      if (collectingStep === 'essay_type') {
        const detectedType = ['Statement of Purpose', 'Motivation Letter', 'Study Plan', 'Leadership Essay'].find(t => msg.toLowerCase().includes(t.toLowerCase()));
        setCollected(prev => ({ ...prev, essayType: detectedType || msg }));
        setCollectingStep('notes');
        addMessage('ai', `**${detectedType || msg}** — excellent format choice.\n\nNow tell me about yourself — your background, achievements, career goals, and why you're a strong candidate. The more detail you share, the better your essay will be.`);
        return;
      }
      if (collectingStep === 'notes') {
        setCollected(prev => ({ ...prev, notes: prev.notes ? prev.notes + '\n' + msg : msg }));
        await generateDraft();
        return;
      }
    } else if (convStage === 'draft_ready') {
      const wantsCritique = /yes|critique|review|improve/i.test(msg);
      if (wantsCritique) {
        await generateCritique();
      } else {
        // Skip critique, go straight to polish
        await generatePolish();
      }
    } else if (convStage === 'critique_ready') {
      const wantsPolish = /polish|yes|improve|refine|apply/i.test(msg);
      if (wantsPolish) {
        await generatePolish();
      } else {
        const finalProduct = draftContent;
        setPolishedContent(finalProduct);
        setStage('ready_polish');
        setConvStage('polish_ready');
        addMessage('ai', `Your essay is ready! You can **copy it**, **save to vault**, or **send for mentor review**.\n\nWhat would you like to do?`);
      }
    } else if (convStage === 'polish_ready') {
      const wantsNew = /new|restart|start/i.test(msg);
      const wantsSave = /save|vault/i.test(msg);
      const wantsMentor = /mentor|review|feedback/i.test(msg);
      if (wantsNew) {
        handleRestart();
      } else if (wantsSave) {
        handleSaveToVault();
      } else if (wantsMentor) {
        handleSendToMentor();
      } else {
        addMessage('ai', 'You can choose: **Start a new essay**, **Save to vault**, or **Send for mentor review**.');
      }
    }
  };

  const handleSendToMentor = async () => {
    const finalProduct = polishedContent || draftContent;
    if (!finalProduct || !currentEssayId) {
      toast.error('No essay to send for review');
      return;
    }
    try {
      const token = localStorage.getItem('zawadi_token');
      const res = await fetch('/api/essays/request-mentor-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          essay_id: currentEssayId,
          essay_content: finalProduct,
          scholarship_name: collected.scholarshipName,
          student_notes: collected.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error || 'Failed to send for mentor review');
        return;
      }
      toast.success('Essay sent for mentor review! You\'ll be notified when feedback is ready.');
      addMessage('ai', `✅ Your essay has been submitted for **mentor review**! An admin will assign a mentor who will review and provide feedback.\n\nWhat would you like to do next?`);
    } catch {
      toast.error('Network error. Please try again.');
    }
  };

  const generateDraft = async () => {
    setConvStage('generating_draft');
    setStage('drafting');
    addMessage('ai', `Generating your ${collected.essayType} for **${collected.scholarshipName}**...`);
    try {
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'draft', undefined, collected.wordCount);
      setCurrentEssayId(res.id);
      setDraftContent(res.content);
      setRemainingToday(res.remaining_today);
      setDailyLimit(res.daily_limit);
      streamText(res.content, 8, () => {
        setStage('ready_draft');
        setConvStage('draft_ready');
        addMessage('ai', `Here's your draft! Take a look in the workspace panel.\n\nWould you like me to **critique** this draft and suggest improvements? Just say "yes" or share any specific concerns.`);
      });
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
      setConvStage('collecting_info');
      setStage('idle');
      addMessage('ai', 'Sorry, something went wrong. Let\'s try again — tell me about the scholarship you\'re applying for.');
    }
  };

  const generateCritique = async () => {
    if (!currentEssayId || !draftContent) return;
    setConvStage('generating_critique');
    setStage('critiquing');
    addMessage('ai', 'Analyzing your draft for structure, impact, and clarity...');
    try {
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'critique', draftContent, collected.wordCount);
      setCritiqueContent(res.content);
      streamText(res.content, 8, () => {
        setStage('ready_critique');
        setConvStage('critique_ready');
        addMessage('ai', `Here's my critique. Review it in the workspace.\n\nReady for me to **polish** the essay with these improvements? Just say "polish" or "yes"!`);
      });
    } catch (e: any) {
      toast.error(e.message || 'Critique failed');
      setConvStage('draft_ready');
      setStage('ready_draft');
    }
  };

  const generatePolish = async () => {
    if (!currentEssayId) return;
    const textToPolish = polishedContent || critiqueContent || draftContent;
    if (!textToPolish) return;
    setConvStage('generating_polish');
    setStage('polishing');
    addMessage('ai', 'Polishing your essay for maximum impact...');
    try {
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'polish', textToPolish, collected.wordCount);
      setPolishedContent(res.content);
      streamText(res.content, 10, () => {
        setStage('ready_polish');
        setConvStage('polish_ready');
        addMessage('ai', `Your polished essay is ready! You can **copy it**, **save it to your Document Vault**, or **send it for a mentor review** to get expert feedback.\n\nWhat would you like to do next?`);
      });
    } catch (e: any) {
      toast.error(e.message || 'Polish failed');
      setConvStage('critique_ready');
      setStage('ready_critique');
    }
  };

  const handleCopy = () => {
    const text = polishedContent || draftContent;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleSaveToVault = () => {
    const finalProduct = polishedContent || draftContent;
    if (!finalProduct) return;
    const blob = new Blob([finalProduct], { type: 'application/pdf' });
    const file = new File([blob], `${collected.scholarshipName.replace(/\s+/g, '_')}_Essay.pdf`, { type: 'application/pdf' });
    onUploadMetadata(file, collected.essayType || 'SOP / Essay');
    toast.success('Saved essay to Document Vault!');
  };

  const handleRestart = () => {
    setMessages([{ role: 'ai', content: `Hi ${user?.name || 'there'}! I'm your essay coach. Let's craft a compelling scholarship essay together.\n\n**What scholarship or program are you applying for?**` }]);
    setConvStage('collecting_info');
    setCollectingStep('scholarship');
    setStage('idle');
    setDisplayedText('');
    setDraftContent('');
    setCritiqueContent('');
    setPolishedContent('');
    setCurrentEssayId(null);
    setCollected({ scholarshipName: '', essayType: 'Personal Statement', notes: '', wordCount: 500 });
  };

  const conversationSuggestions = () => {
    if (convStage === 'collecting_info') {
      if (collectingStep === 'scholarship' && scholarships.length > 0) {
        return scholarships.slice(0, 5).map(s => s.name);
      }
      if (collectingStep === 'essay_type') {
        return ['Personal Statement', 'Statement of Purpose', 'Motivation Letter', 'Study Plan', 'Leadership Essay'];
      }
    }
    if (convStage === 'draft_ready') {
      return ['Yes, critique it', 'Looks good to me'];
    }
    if (convStage === 'critique_ready') {
      return ['Polish it', 'I\'ll make changes myself'];
    }
    if (convStage === 'polish_ready') {
      return ['Send for mentor review', 'Save to vault', 'Start a new essay'];
    }
    return [];
  };

  const suggestions = conversationSuggestions();

  const workspaceContent = () => {
    if (stage === 'ready_polish' && polishedContent) return polishedContent;
    if (stage === 'ready_critique' && critiqueContent) return critiqueContent;
    if (stage === 'ready_draft' && draftContent) return draftContent;
    if (stage === 'drafting' || stage === 'critiquing' || stage === 'polishing') return displayedText;
    return '';
  };

  const workspaceTitle = () => {
    if (stage === 'drafting') return '1. Draft in Progress';
    if (stage === 'ready_draft') return '1. Draft Complete';
    if (stage === 'critiquing') return '2. Critique in Progress';
    if (stage === 'ready_critique') return '2. Critique Complete';
    if (stage === 'polishing') return '3. Polish in Progress';
    if (stage === 'ready_polish') return '3. Polished Essay';
    return 'Workspace';
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-6 bg-surface animate-sweep">

      {/* Chat Panel */}
      <div className="w-full lg:w-[420px] flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden shrink-0">
        <div className="flex border-b border-outline-variant">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 font-bold text-xs select-none outline-none border-b-2 uppercase tracking-wider ${activeTab === 'chat' ? 'text-primary border-primary bg-surface-bright' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 font-bold text-xs select-none outline-none border-b-2 uppercase tracking-wider ${activeTab === 'history' ? 'text-primary border-primary bg-surface-bright' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-bright/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-surface-container-high text-on-surface rounded-bl-sm'
                  }`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                        <span className="font-black text-[10px] uppercase tracking-wider text-primary">Zawadi Coach</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-outline-variant bg-surface-container-lowest">
              {collectingStep === 'scholarship' && scholarships.length > 0 && (
                <div className="mb-2">
                  <select
                    onChange={(e) => { if (e.target.value) { setInput(e.target.value); inputRef.current?.focus(); } }}
                    className="w-full p-2 bg-surface border border-outline-variant rounded-lg text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Select a scholarship...</option>
                    {scholarships
                      .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.match?.score ? `[${s.match.score}%] ` : ''}{s.name} — {s.provider}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {suggestions.length > 0 && convStage !== 'generating_draft' && convStage !== 'generating_critique' && convStage !== 'generating_polish' && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:border-primary transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                    if (e.key === 'Enter' && e.shiftKey) { }
                  }}
                  placeholder={
                    convStage === 'generating_draft' || convStage === 'generating_critique' || convStage === 'generating_polish'
                      ? 'AI is working...' : 'Type your message...'
                  }
                  disabled={convStage === 'generating_draft' || convStage === 'generating_critique' || convStage === 'generating_polish'}
                  className="flex-1 p-2.5 rounded-lg border border-outline-variant bg-surface-bright text-xs text-on-surface placeholder:opacity-50 focus:outline-none focus:border-primary disabled:opacity-40"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={convStage === 'generating_draft' || convStage === 'generating_critique' || convStage === 'generating_polish' || !input.trim()}
                  className="p-2.5 bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
              <p className="text-[9px] text-outline text-center mt-1.5 font-semibold">
                Daily: {remainingToday}/{dailyLimit} essays remaining
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-bright">
            {essays.map((e) => (
              <div
                key={e.id}
                onClick={() => {
                  setCollected({
                    scholarshipName: e.scholarship_name,
                    essayType: e.essay_type,
                    notes: e.prompt,
                    wordCount: 500,
                  });
                  setDraftContent(e.draft);
                  setPolishedContent(e.final);
                  setDisplayedText(e.final || e.draft);
                  setStage(e.final ? 'ready_polish' : 'ready_draft');
                  setConvStage(e.final ? 'polish_ready' : 'draft_ready');
                  setActiveTab('chat');
                  setMessages(prev => [...prev, { role: 'ai', content: `Loaded **${e.scholarship_name}** from history. What would you like to do with it?` }]);
                }}
                className="p-3 rounded-xl border border-outline-variant bg-surface-container-lowest hover:border-primary cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="bg-primary-fixed text-primary text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{e.essay_type}</span>
                </div>
                <h4 className="font-bold text-xs text-primary group-hover:text-secondary truncate">{e.scholarship_name}</h4>
                <p className="text-[10px] text-on-surface-variant truncate mt-1">{e.final || e.draft}</p>
              </div>
            ))}
            {essays.length === 0 && (
              <div className="text-center py-12 text-outline">
                <span className="material-symbols-outlined text-3xl mb-2">history</span>
                <p className="text-xs">No saved essays yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace Panel */}
      <div className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant bg-surface-bright flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                stage === 'drafting' ? 'bg-primary text-on-primary animate-pulse' :
                stage === 'ready_draft' || stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'bg-status-success text-white' : 'bg-surface-container-highest text-on-surface-variant'
              }`}>
                {stage === 'ready_draft' || stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? '✓' : '1'}
              </div>
              <span className={`font-bold ${stage.startsWith('ready') || stage === 'critiquing' || stage === 'polishing' ? 'text-status-success' : 'text-primary'}`}>Draft</span>
            </div>
            <div className="w-6 h-px bg-outline-variant/40"></div>
            <div className={`flex items-center gap-1.5 text-xs transition-opacity ${stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                stage === 'critiquing' ? 'bg-primary text-on-primary animate-pulse' :
                stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'bg-status-success text-white' : 'bg-surface-container-highest text-on-surface-variant'
              }`}>
                {stage === 'ready_polish' || stage === 'polishing' ? '✓' : '2'}
              </div>
              <span className={`font-bold ${stage === 'ready_polish' || stage === 'polishing' ? 'text-status-success' : 'text-primary'}`}>Critique</span>
            </div>
            <div className="w-6 h-px bg-outline-variant/40"></div>
            <div className={`flex items-center gap-1.5 text-xs transition-opacity ${stage === 'polishing' || stage === 'ready_polish' ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                stage === 'polishing' ? 'bg-primary text-on-primary animate-pulse' :
                stage === 'ready_polish' ? 'bg-status-success text-white' : 'bg-surface-container-highest text-on-surface-variant'
              }`}>3</div>
              <span className={`font-bold ${stage === 'ready_polish' ? 'text-status-success' : 'text-primary'}`}>Polish</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stage.startsWith('ready') && workspaceContent() && (
              <>
                <button onClick={handleCopy} className="p-1.5 border border-outline-variant hover:bg-surface-container-low text-on-surface-variant rounded-lg transition-colors cursor-pointer" title="Copy">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
                <button onClick={handleSaveToVault} className="p-1.5 bg-secondary-container border border-secondary/30 text-on-secondary-container hover:bg-secondary-fixed rounded-lg transition-all cursor-pointer" title="Save to vault">
                  <span className="material-symbols-outlined text-sm">folder_zip</span>
                </button>
                {stage === 'ready_polish' && (
                  <button onClick={handleSendToMentor} className="p-1.5 bg-primary border border-primary/30 text-on-primary hover:bg-primary-fixed hover:text-on-primary-fixed rounded-lg transition-all cursor-pointer flex items-center gap-1" title="Send for mentor review">
                    <span className="material-symbols-outlined text-sm">rate_review</span>
                    <span className="text-[10px] font-bold hidden sm:inline">Mentor Review</span>
                  </button>
                )}
              </>
            )}
            {stage !== 'idle' && (
              <button onClick={handleRestart} className="p-1.5 border border-outline-variant hover:bg-surface-container-low text-on-surface-variant rounded-lg transition-colors cursor-pointer" title="New essay">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 md:p-10 lg:px-16 overflow-y-auto relative bg-surface-container-lowest">
          {stage === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-outline">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-40">forum</span>
              <h3 className="font-display text-lg font-black text-on-surface mb-1">Conversational Essay Studio</h3>
              <p className="text-xs text-on-surface-variant max-w-sm">Chat with your AI coach to craft compelling scholarship essays. Tell me about the scholarship you're applying for!</p>
            </div>
          )}

          {stage !== 'idle' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                <div>
                  <h2 className="font-display font-black text-primary text-sm">{workspaceTitle()}</h2>
                  {collected.scholarshipName && (
                    <p className="text-[10px] text-outline font-semibold mt-0.5">{collected.scholarshipName} — {collected.essayType}</p>
                  )}
                </div>
                {(stage === 'drafting' || stage === 'critiquing' || stage === 'polishing') && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-status-warning/10 text-status-warning animate-pulse flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">hourglass_top</span>
                    Generating
                  </span>
                )}
              </div>
              <div className="font-body-md text-sm md:text-base text-on-surface leading-relaxed whitespace-pre-wrap font-light py-2">
                {workspaceContent()}
                {(stage === 'drafting' || stage === 'critiquing' || stage === 'polishing') && (
                  <span className="w-2 h-4 inline-block bg-primary animate-pulse ml-0.5"></span>
                )}
              </div>
              <div ref={streamEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
