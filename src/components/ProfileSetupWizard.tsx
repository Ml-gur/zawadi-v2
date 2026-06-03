import React, { useState } from 'react';
import { AFRICAN_COUNTRIES } from '../config/matching-config';

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
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 pb-0 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-black text-primary">
              Tell us about yourself
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Five quick questions so we can match you to the right scholarships.
            </p>
          </div>
          <button onClick={onDismiss} className="p-2 hover:bg-surface-container rounded-lg cursor-pointer text-on-surface-variant">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Date of Birth */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Date of Birth *</label>
            <input
              type="date"
              value={profile.date_of_birth}
              onChange={e => update('date_of_birth', e.target.value)}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* 2. Nationality */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Your Country / Nationality *</label>
            <select
              value={profile.country}
              onChange={e => update('country', e.target.value)}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">Select your country...</option>
              {AFRICAN_COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Current Degree Level */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Current Degree Level *</label>
            <div className="grid grid-cols-2 gap-2">
              {['Bachelors', 'Masters', 'PhD', 'Doctorate', 'Postdoctoral'].map(d => (
                <button
                  key={d}
                  onClick={() => update('degree_level', d)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    profile.degree_level === d
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface border-outline-variant text-on-surface hover:border-primary'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Desired Field of Study */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Desired Field of Study *</label>
            <select
              value={profile.field_of_study}
              onChange={e => update('field_of_study', e.target.value)}
              className="w-full p-3 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
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
            <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">Current GPA *</label>
            <div className="flex gap-3 items-start">
              <input
                type="number"
                value={profile.gpa}
                onChange={e => update('gpa', e.target.value)}
                placeholder="e.g. 3.8"
                className="flex-1 p-3 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:border-primary"
                step="0.01"
                min="0"
                max="100"
              />
              <div className="flex flex-col gap-1 shrink-0">
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${profile.gpa_system === 'us4' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary'}`}>
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
                <label className={`px-3 py-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${profile.gpa_system === 'pct_100' ? 'bg-primary text-on-primary border-primary' : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary'}`}>
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
          <button
            onClick={handleFinish}
            disabled={!allFilled}
            className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Save & See My Matches
          </button>
        </div>
      </div>
    </div>
  );
}
