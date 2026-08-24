import { useEffect, useState } from 'react';
import { AlertCircle, Brain, CheckCircle, Cpu, Eye, EyeOff, Key, PlugZap, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { callAdminApi } from '../../../lib/admin-api';
import { AdminSectionShell } from '../ui/AdminSectionShell';

interface AiConfig {
  provider: string;
  has_openai: boolean;
  has_deepseek: boolean;
  has_gemini: boolean;
}

const PROVIDERS = [
  { value: 'deepseek', label: 'DeepSeek', hint: 'Default · best value' },
  { value: 'openai', label: 'OpenAI', hint: 'GPT-4o family' },
  { value: 'gemini', label: 'Google Gemini', hint: 'Gemini 2.0 Flash' },
] as const;

export function AiConfigTab() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({ provider: 'deepseek', openai_key: '', deepseek_key: '', gemini_key: '' });

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-settings', { body: {} });
      if (data && !fnError) {
        setConfig(data);
        setForm({ provider: data.provider || 'deepseek', openai_key: '', deepseek_key: '', gemini_key: '' });
      } else {
        setError(fnError?.message || 'Could not load AI configuration');
      }
    } catch (e) {
      setError((e as Error).message || 'Could not load AI configuration');
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = { action: 'update', provider: form.provider };
      if (form.openai_key) body.openai_key = form.openai_key;
      if (form.deepseek_key) body.deepseek_key = form.deepseek_key;
      if (form.gemini_key) body.gemini_key = form.gemini_key;
      const { data, error: fnError } = await supabase.functions.invoke('admin-settings', { body });
      if (data?.success && !fnError) {
        setSaved(true);
        setEditMode(false);
        setTimeout(() => setSaved(false), 3000);
        loadConfig();
      } else {
        setError(data?.error || fnError?.message || 'Save failed');
      }
    } catch (e) {
      setError((e as Error).message || 'Network error');
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await callAdminApi<{ provider: string; model?: string; latency_ms: number }>('ai.test');
      setTestResult({ ok: true, message: `${result.provider} responded in ${result.latency_ms}ms${result.model ? ` · ${result.model}` : ''}` });
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    }
    setTesting(false);
  }

  const keyFor = (p: string) => p === 'openai' ? config?.has_openai : p === 'gemini' ? config?.has_gemini : config?.has_deepseek;

  return (
    <AdminSectionShell
      title="AI Config"
      description="One provider powers essay generation, document analysis and the connection test. Keys are stored server-side and never shown again."
      actions={!editMode ? (
        <button
          onClick={() => setEditMode(true)}
          className="px-5 min-h-[44px] rounded-full border border-off-black-ink text-ed-body-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white transition-colors cursor-pointer"
        >
          Edit configuration
        </button>
      ) : undefined}
    >
      {loading ? (
        <div className="bg-pure-white border border-ash rounded-ed py-16 text-center">
          <span className="inline-block w-5 h-5 border-2 border-graphite border-t-transparent rounded-full animate-spin" aria-label="Loading" />
        </div>
      ) : (
        <div className="space-y-4">
          {saved && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-electric-lime/20 text-ed-body-sm text-off-black-ink">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Configuration saved — all AI features now use {config?.provider}.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-error/10 text-ed-body-sm text-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-pure-white border border-ash rounded-ed p-6">
            {!editMode ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-parchment shrink-0" aria-hidden>
                    <Cpu className="w-4 h-4 text-off-black-ink" strokeWidth={1.5} />
                  </span>
                  <div>
                    <p className="text-ed-eyebrow uppercase text-graphite">Active provider</p>
                    <p className="text-ed-sub font-medium text-off-black-ink tracking-tight">
                      {PROVIDERS.find((p) => p.value === (config?.provider || 'deepseek'))?.label || 'DeepSeek'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PROVIDERS.map((p) => {
                    const hasKey = keyFor(p.value);
                    const isActive = (config?.provider || 'deepseek') === p.value;
                    return (
                      <div key={p.value} className={`p-4 rounded-lg border transition-colors ${isActive ? 'border-off-black-ink bg-mist' : 'border-ash'}`}>
                        <div className="flex items-center justify-between">
                          <p className="text-ed-body-sm font-medium text-off-black-ink">{p.label}</p>
                          {isActive && <span className="text-[10px] font-medium uppercase bg-electric-lime text-off-black-ink px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <p className="text-ed-caption tracking-normal text-graphite mt-0.5">{p.hint}</p>
                        <p className={`mt-2 inline-flex items-center gap-1 text-ed-caption tracking-normal ${hasKey ? 'text-status-success' : 'text-stone'}`}>
                          <Key className="w-3 h-3" />
                          {hasKey ? 'Key configured' : 'No key set'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-ash flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="inline-flex items-center gap-2 rounded-full border border-off-black-ink px-5 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <PlugZap className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
                    {testing ? 'Testing…' : 'Test connection'}
                  </button>
                  {testResult && (
                    <p className={`text-ed-body-sm ${testResult.ok ? 'text-status-success' : 'text-error'}`}>{testResult.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="ai-provider" className="block text-ed-body-sm font-medium text-off-black-ink mb-2">Provider</label>
                  <select
                    id="ai-provider"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full bg-pure-white border border-ash rounded-lg px-4 min-h-[44px] text-ed-body-sm text-off-black-ink focus:border-graphite outline-none cursor-pointer"
                  >
                    {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowKeys(!showKeys)}
                  className="inline-flex items-center gap-2 text-ed-body-sm text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showKeys ? 'Hide keys' : 'Show keys'}
                </button>

                {([['openai', 'OpenAI API key', 'sk-…'], ['deepseek', 'DeepSeek API key', 'sk-…'], ['gemini', 'Google Gemini API key', 'AIza…']] as const).map(([field, label, placeholder]) => (
                  <div key={field}>
                    <label htmlFor={`key-${field}`} className="block text-ed-body-sm font-medium text-off-black-ink mb-1.5">{label}</label>
                    <input
                      id={`key-${field}`}
                      type={showKeys ? 'text' : 'password'}
                      placeholder={keyFor(field) ? 'Saved — enter a new value to replace' : placeholder}
                      value={form[`${field}_key` as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [`${field}_key`]: e.target.value })}
                      className="w-full bg-pure-white border border-ash rounded-lg px-4 py-3 min-h-[44px] text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors"
                    />
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save configuration'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setError(''); }}
                    className="px-6 min-h-[44px] rounded-full border border-ash text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-pure-white border border-ash rounded-ed p-6">
            <p className="inline-flex items-center gap-2 text-ed-body-sm font-medium text-off-black-ink mb-3">
              <Brain className="w-4 h-4" aria-hidden />
              How this works
            </p>
            <ul className="space-y-2 text-ed-body-sm text-graphite list-disc pl-5">
              <li>Essay generation uses the active provider's key; document analysis uses DeepSeek with the same stored key.</li>
              <li>Without a key, essays fall back to template content and documents are extracted by pattern matching only — everything else keeps working.</li>
              <li>You can switch providers anytime; the change takes effect on the next generation.</li>
            </ul>
          </div>
        </div>
      )}
    </AdminSectionShell>
  );
}
