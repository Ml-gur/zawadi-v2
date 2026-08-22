import React, { useState } from 'react';
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
  'w-full bg-canvas border border-hairline rounded-lg px-4 py-3 min-h-[44px] text-cream placeholder:text-muted focus:border-accent-green focus-visible:ring-2 focus-visible:ring-accent-green/40 outline-none transition-colors';

export default function ProfileSetupWizard({ user, onSave, onDismiss }: ProfileSetupWizardProps) {
  const [profile, setProfile] = useState({
    // MVSP — asked on first login
    date_of_birth: user?.date_of_birth || '',
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

  const allFilled = profile.date_of_birth && profile.country && profile.degree_level && profile.field_of_study && profile.gpa;

  const handleFinish = async () => {
    await onSave(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-sweep">
      <div className="bg-off-black border border-hairline rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 pb-0 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-black text-cream">
              Tell us about yourself
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Five quick questions so we can match you to the right scholarships.
            </p>
          </div>
          <button onClick={onDismiss} className="p-2 rounded-lg cursor-pointer text-muted transition-colors hover:bg-cream/[0.04] hover:text-cream">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Date of Birth */}
          <div>
            <label className="mb-2 block text-sm text-cream">Date of Birth *</label>
            <input
              type="date"
              value={profile.date_of_birth}
              onChange={e => update('date_of_birth', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 2. Nationality */}
          <div>
            <label className="mb-2 block text-sm text-cream">Your Country / Nationality *</label>
            <select
              value={profile.country}
              onChange={e => update('country', e.target.value)}
              className={`${inputClass} bg-canvas text-cream cursor-pointer`}
            >
              <option value="">Select your country...</option>
              {AFRICAN_COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Current Degree Level */}
          <div>
            <label className="mb-2 block text-sm text-cream">Current Degree Level *</label>
            <div className="grid grid-cols-2 gap-2">
              {['Bachelors', 'Masters', 'PhD', 'Doctorate', 'Postdoctoral'].map(d => (
                <button
                  key={d}
                  onClick={() => update('degree_level', d)}
                  className={`p-3 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                    profile.degree_level === d
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'bg-canvas border-hairline text-cream hover:border-accent-blue/60'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Desired Field of Study */}
          <div>
            <label className="mb-2 block text-sm text-cream">Desired Field of Study *</label>
            <select
              value={profile.field_of_study}
              onChange={e => update('field_of_study', e.target.value)}
              className={`${inputClass} bg-canvas text-cream cursor-pointer`}
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
            <label className="mb-2 block text-sm text-cream">Current GPA *</label>
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
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${profile.gpa_system === 'us4' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'bg-canvas border-hairline text-muted hover:border-accent-blue/60'}`}>
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
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${profile.gpa_system === 'pct_100' ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'bg-canvas border-hairline text-muted hover:border-accent-blue/60'}`}>
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

        <div className="p-6 pt-0">
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
