import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { AFRICAN_COUNTRIES } from '../../../config/matching-config';
import type { Scholarship } from '../../../types';

export interface ScholarshipFormValues {
  name: string;
  provider: string;
  host_institution: string;
  amount: string;
  deadline: string;
  funding_type: 'Full' | 'Partial';
  apply_url: string;
  source_url?: string;
  description: string;
  eligibility: string;
  countries: string[];
  degree_levels: string[];
  fields_of_study: string[];
  required_documents: string[];
  no_ielts: boolean;
  published: boolean;
  category?: string;
}

interface ScholarshipFormProps {
  open: boolean;
  editing: Scholarship | null;
  onClose: () => void;
  onSubmit: (values: ScholarshipFormValues) => void;
}

const DEGREES = ['Bachelors', 'Masters', 'PhD', 'Postdoctoral'];
const CATEGORIES = [
  'Full Scholarships Open Now', 'Full Scholarships Opening Soon', 'Partial Scholarships & Tuition Waivers',
  'Intra-African Scholarships', 'No IELTS Scholarships', 'Undergraduate Scholarships',
  'Corporate & Foundation Scholarships', 'Francophone & Lusophone Scholarships',
];

const PRESETS: { label: string; pick: () => string[] }[] = [
  { label: 'All Africa', pick: () => AFRICAN_COUNTRIES.map((c) => c.code) },
  { label: 'Clear', pick: () => [] },
  { label: 'East', pick: () => AFRICAN_COUNTRIES.filter((c) => c.region === 'East Africa').map((c) => c.code) },
  { label: 'West', pick: () => AFRICAN_COUNTRIES.filter((c) => c.region === 'West Africa').map((c) => c.code) },
  { label: 'North', pick: () => AFRICAN_COUNTRIES.filter((c) => c.region === 'North Africa').map((c) => c.code) },
  { label: 'Central', pick: () => AFRICAN_COUNTRIES.filter((c) => c.region === 'Central Africa').map((c) => c.code) },
  { label: 'Southern', pick: () => AFRICAN_COUNTRIES.filter((c) => c.region === 'Southern Africa').map((c) => c.code) },
  { label: 'Anglophone', pick: () => AFRICAN_COUNTRIES.filter((c) => c.lang === 'english').map((c) => c.code) },
  { label: 'Francophone', pick: () => AFRICAN_COUNTRIES.filter((c) => c.lang === 'french').map((c) => c.code) },
  { label: 'Lusophone', pick: () => AFRICAN_COUNTRIES.filter((c) => c.lang === 'portuguese').map((c) => c.code) },
];

const inputCls = 'w-full bg-pure-white border border-ash rounded-lg px-4 py-3 min-h-[44px] text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors';
const labelCls = 'block text-ed-body-sm font-medium text-off-black-ink mb-1.5';

function toArray(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export function ScholarshipForm({ open, editing, onClose, onSubmit }: ScholarshipFormProps) {
  const [values, setValues] = useState<ScholarshipFormValues>({
    name: '', provider: '', host_institution: '', amount: 'Full Tuition & Academic Stipend',
    deadline: new Date(Date.now() + 60 * 86_400_000).toISOString().split('T')[0],
    funding_type: 'Full', apply_url: '', source_url: '', description: '', eligibility: '',
    countries: [], degree_levels: ['Masters'], fields_of_study: [], required_documents: [],
    no_ielts: false, published: true, category: '',
  });
  const [fieldsText, setFieldsText] = useState('');
  const [docsText, setDocsText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setValues({
        name: editing.name ?? '', provider: editing.provider ?? '',
        host_institution: editing.host_institution || editing.host || '',
        amount: editing.amount ?? '', deadline: editing.deadline ?? '',
        funding_type: editing.funding_type === 'Partial' ? 'Partial' : 'Full',
        apply_url: editing.apply_url ?? '', source_url: editing.source_url ?? '',
        description: editing.description ?? '', eligibility: editing.eligibility ?? '',
        countries: editing.countries ?? [], degree_levels: editing.degree_levels ?? [],
        fields_of_study: editing.fields_of_study ?? [], required_documents: editing.required_documents ?? [],
        no_ielts: editing.no_ielts ?? false, published: editing.published ?? false,
        category: editing.category ?? '',
      });
      setFieldsText((editing.fields_of_study ?? []).join(', '));
      setDocsText((editing.required_documents ?? []).join(', '));
    } else {
      setValues({
        name: '', provider: '', host_institution: '', amount: 'Full Tuition & Academic Stipend',
        deadline: new Date(Date.now() + 60 * 86_400_000).toISOString().split('T')[0],
        funding_type: 'Full', apply_url: '', source_url: '', description: '', eligibility: '',
        countries: [], degree_levels: ['Masters'], fields_of_study: [], required_documents: [],
        no_ielts: false, published: true, category: '',
      });
      setFieldsText('');
      setDocsText('');
    }
  }, [open, editing]);

  if (!open) return null;

  const set = <K extends keyof ScholarshipFormValues>(key: K, value: ScholarshipFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const toggle = (list: string[], code: string) =>
    list.includes(code) ? list.filter((c) => c !== code) : [...list, code];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name || !values.provider || !values.host_institution || !values.apply_url) {
      setError('Title, sponsor, host institution and apply link are required.');
      return;
    }
    if (!values.apply_url.startsWith('http')) {
      setError('Apply link must start with http:// or https://');
      return;
    }
    if (values.countries.length === 0) {
      setError('Choose at least one eligible country.');
      return;
    }
    onSubmit({
      ...values,
      fields_of_study: toArray(fieldsText),
      required_documents: toArray(docsText),
      source_url: values.source_url || undefined,
      category: values.category || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-off-black-ink/65 backdrop-blur-sm animate-sweep" role="dialog" aria-modal="true" aria-label={editing ? 'Edit scholarship' : 'Add scholarship'}>
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-pure-white border-l border-ash overflow-y-auto">
        <div className="sticky top-0 bg-pure-white border-b border-ash px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-ed-sub font-medium text-off-black-ink tracking-tight">{editing ? 'Edit listing' : 'Add scholarship'}</h3>
          <button onClick={onClose} aria-label="Close" className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <p className="bg-error/10 text-error text-ed-body-sm rounded-lg px-4 py-3">{error}</p>}

          <div>
            <label htmlFor="sf-name" className={labelCls}>Title *</label>
            <input id="sf-name" value={values.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Mastercard Foundation Scholars Program" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sf-provider" className={labelCls}>Sponsor *</label>
              <input id="sf-provider" value={values.provider} onChange={(e) => set('provider', e.target.value)} className={inputCls} placeholder="e.g. Mastercard Foundation" />
            </div>
            <div>
              <label htmlFor="sf-host" className={labelCls}>Host institution *</label>
              <input id="sf-host" value={values.host_institution} onChange={(e) => set('host_institution', e.target.value)} className={inputCls} placeholder="e.g. University of Edinburgh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sf-funding" className={labelCls}>Funding</label>
              <select id="sf-funding" value={values.funding_type} onChange={(e) => set('funding_type', e.target.value as 'Full' | 'Partial')} className={`${inputCls} cursor-pointer`}>
                <option value="Full">Full</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
            <div>
              <label htmlFor="sf-amount" className={labelCls}>Value</label>
              <input id="sf-amount" value={values.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="sf-deadline" className={labelCls}>Deadline</label>
              <input id="sf-deadline" type="date" value={values.deadline} onChange={(e) => set('deadline', e.target.value)} className={`${inputCls} [color-scheme:light]`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sf-apply" className={labelCls}>Apply link *</label>
              <input id="sf-apply" type="url" value={values.apply_url} onChange={(e) => set('apply_url', e.target.value)} className={inputCls} placeholder="https://…" />
            </div>
            <div>
              <label htmlFor="sf-source" className={labelCls}>Source URL</label>
              <input id="sf-source" type="url" value={values.source_url} onChange={(e) => set('source_url', e.target.value)} className={inputCls} placeholder="https://…" />
            </div>
          </div>

          <div>
            <label htmlFor="sf-desc" className={labelCls}>Description</label>
            <textarea id="sf-desc" value={values.description} onChange={(e) => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label htmlFor="sf-elig" className={labelCls}>Eligibility</label>
            <textarea id="sf-elig" value={values.eligibility} onChange={(e) => set('eligibility', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div>
            <span className={labelCls}>Eligible countries *</span>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => set('countries', preset.pick())}
                  className="px-3 min-h-[32px] rounded-full border border-ash text-[11px] font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1">
              {AFRICAN_COUNTRIES.map((c) => (
                <label key={c.code} className={`inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[11px] cursor-pointer transition-colors ${values.countries.includes(c.code) ? 'border-transparent bg-electric-lime text-off-black-ink' : 'border-ash text-graphite hover:border-graphite'}`}>
                  <input
                    type="checkbox"
                    checked={values.countries.includes(c.code)}
                    onChange={() => set('countries', toggle(values.countries, c.code))}
                    className="sr-only"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Degree levels</span>
            <div className="flex flex-wrap gap-1.5">
              {DEGREES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('degree_levels', toggle(values.degree_levels, d))}
                  className={`px-3 min-h-[36px] rounded-full border text-[11px] font-medium transition-colors cursor-pointer ${values.degree_levels.includes(d) ? 'border-transparent bg-electric-lime text-off-black-ink' : 'border-ash text-graphite hover:border-graphite'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sf-fields" className={labelCls}>Fields of study</label>
              <input id="sf-fields" value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} className={inputCls} placeholder="Computer Science, Law,…" />
            </div>
            <div>
              <label htmlFor="sf-docs" className={labelCls}>Required documents</label>
              <input id="sf-docs" value={docsText} onChange={(e) => setDocsText(e.target.value)} className={inputCls} placeholder="CV, Transcript, SOP,…" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sf-category" className={labelCls}>Category</label>
              <select id="sf-category" value={values.category} onChange={(e) => set('category', e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">None</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="inline-flex items-center gap-2 text-ed-body-sm text-off-black-ink cursor-pointer">
                <input type="checkbox" checked={values.no_ielts} onChange={(e) => set('no_ielts', e.target.checked)} className="w-4 h-4 cursor-pointer accent-[#466800]" />
                No IELTS required
              </label>
              <label className="inline-flex items-center gap-2 text-ed-body-sm text-off-black-ink cursor-pointer">
                <input type="checkbox" checked={values.published} onChange={(e) => set('published', e.target.checked)} className="w-4 h-4 cursor-pointer accent-[#466800]" />
                Publish immediately
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-ash">
            <button type="submit" className="rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer">
              {editing ? 'Save changes' : 'Create listing'}
            </button>
            <button type="button" onClick={onClose} className="px-6 min-h-[44px] rounded-full border border-ash text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
