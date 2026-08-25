import { useState } from 'react';
import { X } from 'lucide-react';
import { AFRICAN_COUNTRIES } from '../config/matching-config';
import { GhostPillButton } from './ui/GhostPillButton';

// ARCHITECTURAL DECISION — conversational replacement candidate
// Future sprint: replace this profile wizard with a sequential
// conversational AI onboarding flow. The AI would guide the student
// through a natural chat to collect the same five MVSP data points
// (date of birth, nationality, GPA, field of study, degree level) and
// optionally enrich the profile in a second session after matches are
// shown. The current wizard stays and functions as the synchronous
// onboarding path. When the conversational flow is implemented, trigger
// it instead of this component based on a feature flag or user cohort.

interface ProfileSetupWizardProps {
  user: any;
  onSave: (profile: any) => void | Promise<void>;
  onDismiss: () => void;
}

const inputClass =
  'w-full bg-pure-white border border-ash rounded-lg px-4 py-3 min-h-[44px] text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite focus-visible:ring-2 focus-visible:ring-graphite/25 outline-none transition-colors [color-scheme:light]';

const chipSelected = 'border-transparent bg-electric-lime text-off-black-ink';
const chipUnselected = 'bg-pure-white border-ash text-graphite hover:border-graphite';

export default function ProfileSetupWizard({ user, onSave, onDismiss }: ProfileSetupWizardProps) {
  const [profile, setProfile] = useState({
    // MVSP — asked on first login
    age: user?.age || '',
    gender: user?.gender || '',
    country: user?.country || '',
    degree_level: user?.degree_level || '',
    field_of_study: user?.field_of_study || '',
    gpa: user?.gpa || '',
    gpa_system: user?.gpa_system || 'us4',
    // Non-MVSP — preserved for secondary completion
    target_fields: user?.target_fields || [],
    degree_class: user?.degree_class || '',
    english_test_type: user?.english_test_type || '',
    english_score: user?.english_score || '',
    destination_openness: user?.destination_openness || 'anywhere',
    destination_regions: user?.destination_regions || [],
    include_fully_funded_anywhere: user?.include_fully_funded_anywhere !== false,
    has_research: user?.has_research ?? false,
    has_leadership: user?.has_leadership ?? false,
    work_experience_years: user?.work_experience_years || '',
  });

  const update = (field: string, value: any) => setProfile(p => ({ ...p, [field]: value }));

  const allFilled = profile.age && profile.country && profile.degree_level && profile.field_of_study && profile.gpa;

  const handleFinish = async () => {
    await onSave(profile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-off-black-ink/65 backdrop-blur-sm p-4 animate-sweep"
      role="dialog"
      aria-modal="true"
      aria-label="Complete your profile"
    >
      <div className="bg-pure-white border border-ash rounded-ed w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 pb-5 border-b border-ash flex items-start justify-between gap-3">
          <div>
            <h2 className="text-ed-sub font-medium text-off-black-ink">
              Tell us about yourself
            </h2>
            <p className="text-ed-body-sm text-graphite mt-1">
              Five quick questions so we can match you to the right scholarships.
            </p>
          </div>
          <button onClick={onDismiss} aria-label="Close" className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer -mt-1 -mr-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Age + Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="wiz-age" className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Age *</label>
              <input
                id="wiz-age"
                type="number"
                min={16}
                max={80}
                inputMode="numeric"
                value={profile.age}
                onChange={e => update('age', e.target.value === '' ? '' : Math.max(16, Math.min(80, Number(e.target.value))))}
                placeholder="e.g. 22"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="wiz-gender" className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Gender *</label>
              <select
                id="wiz-gender"
                value={profile.gender}
                onChange={e => update('gender', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Select…</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* 2. Nationality */}
          <div>
            <label className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Your Country / Nationality *</label>
            <select
              value={profile.country}
              onChange={e => update('country', e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select your country...</option>
              {AFRICAN_COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Current Degree Level */}
          <div>
            <label className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Current Degree Level *</label>
            <div className="grid grid-cols-2 gap-2">
              {['Bachelors', 'Masters', 'PhD', 'Doctorate', 'Postdoctoral'].map(d => (
                <button
                  key={d}
                  onClick={() => update('degree_level', d)}
                  className={`p-3 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${
                    profile.degree_level === d
                      ? chipSelected
                      : chipUnselected
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Desired Field of Study */}
          <div>
            <label className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Desired Field of Study *</label>
            <select
              value={profile.field_of_study}
              onChange={e => update('field_of_study', e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select your field...</option>
              {["Computer Science", "Engineering", "Business", "Public Health", "Law",
                "International Relations", "Economics", "Management", "Political Science",
                "Environmental Science", "Development Studies", "STEM", "Medicine", "Education",
                "Agriculture", "Data Science", "Journalism", "Architecture"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* 5. Current GPA */}
          <div>
            <label className="mb-2 block text-ed-body-sm font-medium text-off-black-ink">Current GPA *</label>
            <div className="flex gap-3 items-start">
              <input
                type="number"
                value={profile.gpa}
                onChange={e => update('gpa', e.target.value)}
                placeholder="e.g. 3.8"
                className={`${inputClass} flex-1`}
                step="0.01"
                min="0"
                max="100"
              />
              <div className="flex flex-col gap-1 shrink-0">
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-medium cursor-pointer transition-all ${profile.gpa_system === 'us4' ? chipSelected : chipUnselected}`}>
                  <input
                    type="radio"
                    name="gpa_scale"
                    value="us4"
                    checked={profile.gpa_system === 'us4'}
                    onChange={() => update('gpa_system', 'us4')}
                    className="sr-only"
                  />
                  4.0 scale
                </label>
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-medium cursor-pointer transition-all ${profile.gpa_system === 'pct_100' ? chipSelected : chipUnselected}`}>
                  <input
                    type="radio"
                    name="gpa_scale"
                    value="pct_100"
                    checked={profile.gpa_system === 'pct_100'}
                    onChange={() => update('gpa_system', 'pct_100')}
                    className="sr-only"
                  />
                  %
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-ash">
          <GhostPillButton
            variant="gradient"
            fullWidth
            disabled={!allFilled}
            onClick={handleFinish}
          >
            Save & See My Matches
          </GhostPillButton>
        </div>
      </div>
    </div>
  );
}
