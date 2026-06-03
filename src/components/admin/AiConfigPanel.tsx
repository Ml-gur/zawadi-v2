import { useState, useEffect } from 'react';
import { Brain, Key, Save, CheckCircle, AlertCircle, Eye, EyeOff, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AiConfig {
  provider: string;
  openai_key: string;
  deepseek_key: string;
  gemini_key: string;
  has_openai: boolean;
  has_deepseek: boolean;
  has_gemini: boolean;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4o)', icon: '🤖' },
  { value: 'deepseek', label: 'DeepSeek (DeepSeek Chat)', icon: '🧠' },
  { value: 'gemini', label: 'Google Gemini (Gemini 2.0 Flash)', icon: '✨' },
];

export default function AiConfigPanel() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ provider: 'gemini', openai_key: '', deepseek_key: '', gemini_key: '' });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-settings', { body: {} });
      if (data && !error) {
        setConfig(data);
        setForm({
          provider: data.provider || 'gemini',
          openai_key: '',
          deepseek_key: '',
          gemini_key: '',
        });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const body: any = { provider: form.provider };
      if (form.openai_key) body.openai_key = form.openai_key;
      if (form.deepseek_key) body.deepseek_key = form.deepseek_key;
      if (form.gemini_key) body.gemini_key = form.gemini_key;

      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { action: 'update', ...body },
      });

      if (data?.success && !error) {
        setSaved(true);
        setEditMode(false);
        setForm({ ...form, openai_key: '', deepseek_key: '', gemini_key: '' });
        loadConfig();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data?.error || error?.message || 'Save failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeProviderLabel = PROVIDERS.find(p => p.value === (config?.provider || 'gemini'))?.label || 'Gemini';

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
              <Brain className="w-5 h-5 text-on-secondary-container" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-on-surface">AI Configuration</h2>
              <p className="text-sm text-on-surface-variant">Configure AI model used for essay generation</p>
            </div>
          </div>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold transition-all hover:brightness-110"
            >
              Edit Configuration
            </button>
          )}
        </div>

        {saved && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-status-success/10 text-status-success text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Configuration saved successfully
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-error/10 text-error text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!editMode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container/50">
              <Cpu className="w-5 h-5 text-primary" />
              <div>
                <span className="text-sm text-on-surface-variant">Active Provider:</span>
                <span className="ml-2 font-bold text-on-surface">{activeProviderLabel}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PROVIDERS.map(p => {
                const hasKey = p.value === 'openai' ? config?.has_openai
                  : p.value === 'deepseek' ? config?.has_deepseek
                  : config?.has_gemini;
                const isActive = (config?.provider || 'gemini') === p.value;
                return (
                  <div
                    key={p.value}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-outline-variant/60 bg-surface-container/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className="font-bold text-sm text-on-surface mb-1">{p.label}</div>
                    <div className={`flex items-center gap-1 text-xs ${
                      hasKey ? 'text-status-success' : 'text-on-surface-variant'
                    }`}>
                      <Key className="w-3 h-3" />
                      {hasKey ? 'Key configured' : 'No key set'}
                    </div>
                    {isActive && (
                      <div className="mt-2 text-xs font-bold text-primary">Active</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">AI Provider</label>
              <select
                value={form.provider}
                onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/60 text-on-surface outline-none focus:border-primary transition-all"
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-outline-variant/20 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowKeys(!showKeys)}
                  className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-all"
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showKeys ? 'Hide API Keys' : 'Show API Keys'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">OpenAI API Key</label>
                  <div className="relative">
                    <input
                      type={showKeys ? 'text' : 'password'}
                      placeholder={config?.has_openai ? '•••••••• (key saved — enter new value to replace)' : 'sk-...'}
                      value={form.openai_key}
                      onChange={e => setForm({ ...form, openai_key: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/60 text-on-surface outline-none focus:border-primary transition-all pr-10"
                    />
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">DeepSeek API Key</label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder={config?.has_deepseek ? '•••••••• (key saved — enter new value to replace)' : 'sk-...'}
                    value={form.deepseek_key}
                    onChange={e => setForm({ ...form, deepseek_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/60 text-on-surface outline-none focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Google Gemini API Key</label>
                  <input
                    type={showKeys ? 'text' : 'password'}
                    placeholder={config?.has_gemini ? '•••••••• (key saved — enter new value to replace)' : 'AIza...'}
                    value={form.gemini_key}
                    onChange={e => setForm({ ...form, gemini_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container border border-outline-variant/60 text-on-surface outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl text-sm font-bold transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              <button
                onClick={() => { setEditMode(false); setError(''); }}
                className="px-6 py-3 border border-outline-variant/60 rounded-2xl text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 shadow-xs">
        <h3 className="font-bold text-on-surface mb-3">How it works</h3>
        <ul className="space-y-2 text-sm text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Essay generation uses the active provider's API key. All three providers are supported.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Without any API key configured, essay generation falls back to template-based content — all other site features work normally.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Bot pipeline (scholarship crawling and import) runs independently of AI — no API key required.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>You can switch providers at any time. Keys are stored securely in the database.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
