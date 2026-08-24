import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Copy, History, MessagesSquare, MessageSquareText, Plus, Save, SendHorizonal, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EssayStudioGeneration } from '../types';
import { SEO } from './SEO';

interface EssayGeneratorProps {
  user: any;
  essays: EssayStudioGeneration[];
  scholarships?: any[];
  documents?: any[];
  onGenerateEssay: (
    essayType: string,
    scholarshipName: string,
    prompt: string,
    stage: 'draft' | 'critique' | 'polish',
    previousContent?: string,
    wordCount?: number,
    documentIds?: string[]
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
  documents = [],
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

  // Filter to analyzed documents (those with ai_extraction_result)
  const analyzedDocIds = useMemo(() => {
    return documents
      .filter((d: any) => d.ai_extraction_result)
      .map((d: any) => d.id);
  }, [documents]);

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
      const { data, error } = await supabase.functions.invoke('mentor-review', {
        body: {
          action: 'request-review',
          essay_id: currentEssayId,
          essay_content: finalProduct,
          scholarship_name: collected.scholarshipName,
          student_notes: collected.notes,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Failed to send for mentor review');
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
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'draft', undefined, collected.wordCount, analyzedDocIds);
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
      const msg = e.message || 'Generation failed';
      if (e.status === 430) {
        addMessage('ai', `⚠️ ${msg}\n\nYou can still work on existing essays or visit the **Subscription Plans** page to upgrade for more generations.`);
      } else {
        toast.error(msg);
      }
      setConvStage('collecting_info');
      setStage('idle');
      if (e.status !== 430) {
        addMessage('ai', 'Sorry, something went wrong. Let\'s try again — tell me about the scholarship you\'re applying for.');
      }
    }
  };

  const generateCritique = async () => {
    if (!currentEssayId || !draftContent) return;
    setConvStage('generating_critique');
    setStage('critiquing');
    addMessage('ai', 'Analyzing your draft for structure, impact, and clarity...');
    try {
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'critique', draftContent, collected.wordCount, analyzedDocIds);
      setCritiqueContent(res.content);
      streamText(res.content, 8, () => {
        setStage('ready_critique');
        setConvStage('critique_ready');
        addMessage('ai', `Here's my critique. Review it in the workspace.\n\nReady for me to **polish** the essay with these improvements? Just say "polish" or "yes"!`);
      });
    } catch (e: any) {
      const msg = e.message || 'Critique failed';
      if (e.status === 430) {
        addMessage('ai', `⚠️ ${msg}\n\nYou can upgrade your plan for more essay generations.`);
      } else {
        toast.error(msg);
      }
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
      const res = await onGenerateEssay(collected.essayType, collected.scholarshipName, collected.notes, 'polish', textToPolish, collected.wordCount, analyzedDocIds);
      setPolishedContent(res.content);
      streamText(res.content, 10, () => {
        setStage('ready_polish');
        setConvStage('polish_ready');
        addMessage('ai', `Your polished essay is ready! You can **copy it**, **save it to your Document Vault**, or **send it for a mentor review** to get expert feedback.\n\nWhat would you like to do next?`);
      });
    } catch (e: any) {
      const msg = e.message || 'Polish failed';
      if (e.status === 430) {
        addMessage('ai', `⚠️ ${msg}\n\nYou can upgrade your plan for more essay generations.`);
      } else {
        toast.error(msg);
      }
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
    <div className="flex-1 w-full min-h-full flex flex-col lg:flex-row overflow-hidden gap-6 lg:gap-0 bg-parchment text-off-black-ink animate-sweep">
      <SEO title="AI Essay Studio | Techsari" description="Draft, critique and polish scholarship essays with AI guidance and human mentor review." path="/essaygenerator" noindex />


      {/* Chat Panel */}
      <div className="w-full lg:w-[420px] flex flex-col bg-deep-charcoal text-pure-white rounded-ed m-0 lg:m-4 p-5 overflow-hidden shrink-0">
        <div className="flex gap-1 bg-white/5 rounded-full p-1 mb-5 shrink-0">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-full font-medium text-xs uppercase tracking-wider select-none outline-none transition-colors ${activeTab === 'chat' ? 'bg-electric-lime text-off-black-ink' : 'text-smoke hover:text-pure-white'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-full font-medium text-xs uppercase tracking-wider select-none outline-none transition-colors ${activeTab === 'history' ? 'bg-electric-lime text-off-black-ink' : 'text-smoke hover:text-pure-white'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-1 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-electric-lime text-off-black-ink rounded-br-sm'
                      : 'bg-white/5 border border-white/10 text-pure-white rounded-bl-sm'
                  }`}>
                    {msg.role === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-electric-lime" aria-hidden />
                        <span className="font-medium text-[10px] uppercase tracking-wider text-electric-lime">Techsari Coach</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="pt-3 mt-1 border-t border-white/10 shrink-0">
              {collectingStep === 'scholarship' && scholarships.length > 0 && (
                <div className="mb-2">
                  <select
                    onChange={(e) => { if (e.target.value) { setInput(e.target.value); inputRef.current?.focus(); } }}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-pure-white focus:outline-none focus:border-electric-lime cursor-pointer"
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
                      className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/10 text-smoke hover:border-electric-lime hover:text-pure-white transition-colors cursor-pointer"
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
                  className="flex-1 p-2.5 rounded-full border border-white/10 bg-white/5 text-xs text-pure-white placeholder:text-smoke focus:outline-none focus:border-electric-lime disabled:opacity-40"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={convStage === 'generating_draft' || convStage === 'generating_critique' || convStage === 'generating_polish' || !input.trim()}
                  className="p-2.5 bg-electric-lime hover:bg-lime-hover text-off-black-ink rounded-full transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <SendHorizonal className="w-4 h-4" aria-hidden />
                </button>
              </div>
              <p className="w-fit mx-auto mt-2 px-3 py-1 rounded-full bg-parchment border border-ash text-ed-eyebrow uppercase tracking-wider text-graphite">
                Daily: {remainingToday}/{dailyLimit} essays remaining
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-white/10">
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
                  className="py-4 cursor-pointer transition-colors group"
                >
                  <span className="inline-block bg-electric-lime text-off-black-ink text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider mb-1.5">{e.essay_type}</span>
                  <h4 className="font-medium text-xs text-pure-white group-hover:text-electric-lime truncate">{e.scholarship_name}</h4>
                  <p className="text-[10px] text-smoke truncate mt-1">{e.final || e.draft}</p>
                </div>
              ))}
            </div>
            {essays.length === 0 && (
              <div className="text-center py-12 text-smoke">
                <History className="w-7 h-7 mx-auto mb-2" aria-hidden />
                <p className="text-xs">No saved essays yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workspace Panel */}
      <div className="flex-1 flex flex-col bg-pure-white border border-ash rounded-ed overflow-hidden lg:my-4 lg:mr-4">
        <div className="px-5 py-3 border-b border-ash bg-pure-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-[10px] ${
                stage === 'drafting' ? 'bg-electric-lime border border-off-black-ink text-off-black-ink animate-pulse' :
                stage === 'ready_draft' || stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'bg-off-black-ink text-pure-white' : 'bg-parchment border border-ash text-graphite'
              }`}>
                {stage === 'ready_draft' || stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? '✓' : '1'}
              </div>
              <span className={`font-medium ${stage === 'idle' ? 'text-graphite' : 'text-off-black-ink'}`}>Draft</span>
            </div>
            <div className="w-6 h-px bg-ash"></div>
            <div className={`flex items-center gap-1.5 text-xs transition-opacity ${stage === 'critiquing' || stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-[10px] ${
                stage === 'critiquing' ? 'bg-electric-lime border border-off-black-ink text-off-black-ink animate-pulse' :
                stage === 'ready_critique' || stage === 'polishing' || stage === 'ready_polish' ? 'bg-off-black-ink text-pure-white' : 'bg-parchment border border-ash text-graphite'
              }`}>
                {stage === 'ready_polish' || stage === 'polishing' ? '✓' : '2'}
              </div>
              <span className="font-medium text-off-black-ink">Critique</span>
            </div>
            <div className="w-6 h-px bg-ash"></div>
            <div className={`flex items-center gap-1.5 text-xs transition-opacity ${stage === 'polishing' || stage === 'ready_polish' ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-[10px] ${
                stage === 'polishing' ? 'bg-electric-lime border border-off-black-ink text-off-black-ink animate-pulse' :
                stage === 'ready_polish' ? 'bg-off-black-ink text-pure-white' : 'bg-parchment border border-ash text-graphite'
              }`}>3</div>
              <span className="font-medium text-off-black-ink">Polish</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stage.startsWith('ready') && workspaceContent() && (
              <>
                <button onClick={handleCopy} className="p-1.5 border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink rounded-full transition-colors cursor-pointer" title="Copy">
                  <Copy className="w-4 h-4" aria-hidden />
                </button>
                <button onClick={handleSaveToVault} className="p-1.5 bg-electric-lime hover:bg-lime-hover text-off-black-ink rounded-full transition-colors cursor-pointer" title="Save to vault">
                  <Save className="w-4 h-4" aria-hidden />
                </button>
                {stage === 'ready_polish' && (
                  <button onClick={handleSendToMentor} className="p-1.5 pr-2.5 bg-electric-lime hover:bg-lime-hover text-off-black-ink rounded-full transition-colors cursor-pointer flex items-center gap-1" title="Send for mentor review">
                    <MessageSquareText className="w-4 h-4" aria-hidden />
                    <span className="text-[10px] font-medium hidden sm:inline">Mentor Review</span>
                  </button>
                )}
              </>
            )}
            {stage !== 'idle' && (
              <button onClick={handleRestart} className="p-1.5 border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink rounded-full transition-colors cursor-pointer" title="New essay">
                <Plus className="w-4 h-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-6 md:p-10 lg:px-16 overflow-y-auto relative bg-pure-white">
          {stage === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-graphite">
              <MessagesSquare className="w-10 h-10 mb-4 text-stone" strokeWidth={1.5} aria-hidden />
              <h3 className="text-lg font-medium text-off-black-ink mb-1">Conversational Essay Studio</h3>
              <p className="text-xs text-graphite max-w-sm">Chat with your AI coach to craft compelling scholarship essays. Tell me about the scholarship you're applying for!</p>
            </div>
          )}

          {stage !== 'idle' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-ash/70">
                <div>
                  <h2 className="font-medium text-off-black-ink text-sm">{workspaceTitle()}</h2>
                  {collected.scholarshipName && (
                    <p className="text-[10px] text-graphite font-medium mt-0.5">{collected.scholarshipName} — {collected.essayType}</p>
                  )}
                </div>
                {(stage === 'drafting' || stage === 'critiquing' || stage === 'polishing') && (
                  <span className="px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider rounded-full bg-electric-lime text-off-black-ink animate-pulse flex items-center gap-1">
                    <Zap className="w-3 h-3" aria-hidden />
                    Generating
                  </span>
                )}
              </div>
              <div className="bg-parchment rounded-lg p-5">
                <div className="text-sm md:text-base text-off-black-ink leading-relaxed whitespace-pre-wrap py-2">
                  {workspaceContent()}
                  {(stage === 'drafting' || stage === 'critiquing' || stage === 'polishing') && (
                    <span className="w-2 h-4 inline-block bg-off-black-ink animate-pulse ml-0.5"></span>
                  )}
                </div>
              </div>
              <div ref={streamEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
