// src/components/StudentProfile.tsx

import React, { useState, useEffect } from 'react';
import { AFRICAN_COUNTRIES, GPA_SYSTEM_CONFIGS, FIELD_GROUPS, GpaSystem, DESTINATION_REGIONS } from '../config/matching-config';
import { resolveDestinationRegion } from '../lib/country-graph';

interface StudentProfileProps {
  user: any;
  onUpdateProfile: (updatedData: any) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

export default function StudentProfile({ user, onUpdateProfile, onNavigateToTab }: StudentProfileProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Helper to build form data from a user object
  const buildFormData = (u: any) => ({
    // Step 1: Identity & Origin
    name: u.name || '',
    country: u.country || 'Kenya',
    date_of_birth: u.date_of_birth || '',
    gender: u.gender || 'Female',
    is_rural_origin: !!u.is_rural_origin,

    // Step 2: Academic Record
    degree_level: u.degree_level || 'Bachelors',
    gpa_system: (u.gpa_system || 'us4') as GpaSystem,
    gpa: u.gpa !== undefined ? u.gpa : '',
    degree_class: u.degree_class || 'first',
    institution: u.institution || '',

    // Step 3: Target & Destination
    field_of_study: u.field_of_study || 'Computer Science',
    target_fields: u.target_fields || [],
    destination_openness: u.destination_openness || (u.study_country_preference ? 'specific' : 'anywhere'),
    destination_regions: u.destination_regions || [],
    include_fully_funded_anywhere: u.include_fully_funded_anywhere !== false,

    // Step 4: Languages
    native_language: u.native_language || 'English',
    english_test_type: u.english_test_type || 'None',
    english_score: u.english_score !== undefined ? u.english_score : '',
    french_level: u.french_level || 'None',
    arabic_level: u.arabic_level || 'None',
    portuguese_level: u.portuguese_level || 'None',

    // Step 5: Special Background
    work_experience_years: u.work_experience_years || 0,
    has_research: !!u.has_research,
    publications: u.publications || 0,
    has_leadership: !!u.has_leadership,
    has_community_service: !!u.has_community_service,
    is_first_generation: !!u.is_first_generation,
    financial_need_level: u.financial_need_level || 'medium',
  });

  // Local state initialized with current user properties
  const [formData, setFormData] = useState(() => buildFormData(user));

  // Re-sync form data whenever user object changes (e.g. after save, or after login restores user from DB)
  useEffect(() => {
    setFormData(buildFormData(user));
  }, [user?.email, user?.updated_at]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckboxChange = (key: string) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setSuccessMsg('');
    try {
      await onUpdateProfile(formData);
      setSuccessMsg('Profile aligned and matched successfully! Scoring models refreshed.');
      // Scroll to top of the page so the user sees the prominent success container immediately
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // GPA fields renderer based on dynamic scale configs
  const currentGpaConfig = GPA_SYSTEM_CONFIGS[formData.gpa_system] || GPA_SYSTEM_CONFIGS.us4;

  const totalSteps = 5;

  const mvspFieldsForCompletion = ['country', 'degree_level', 'field_of_study', 'gpa', 'english_test_type'];
  const filledMvspCount = mvspFieldsForCompletion.filter(f => {
    const val = formData[f as keyof typeof formData];
    return val !== undefined && val !== '' && val !== null;
  }).length;
  const completionPercent = Math.round((filledMvspCount / mvspFieldsForCompletion.length) * 100);

  const [savingStep, setSavingStep] = useState(false);
  const [stepError, setStepError] = useState('');

  const handleStepChange = async (newStep: number) => {
    setStepError('');
    setSavingStep(true);
    try {
      await onUpdateProfile(formData);
      setCurrentStep(newStep);
    } catch {
      setStepError('Failed to save. Please try again.');
    } finally {
      setSavingStep(false);
    }
  };

  const requiredFieldsMsg = (() => {
    const missing: string[] = [];
    if (!formData.country || formData.country === '') missing.push('Nationality');
    if (!formData.degree_level || formData.degree_level === '') missing.push('Degree level');
    if (!formData.field_of_study || formData.field_of_study === '') missing.push('Field of study');
    if (!formData.gpa || formData.gpa === '') missing.push('GPA');
    return missing;
  })();

  const handleFinalSave = async () => {
    if (requiredFieldsMsg.length > 0) {
      setStepError(`Please fill in: ${requiredFieldsMsg.join(', ')}`);
      return;
    }
    await handleSave();
  };

  return (
    <div className="space-y-8 animate-sweep">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">Onboarding Portal v2</span>
          <h2 className="font-display text-2xl font-black text-primary">Academic Persona Configuration</h2>
          <p className="text-xs text-on-surface-variant">Set up your personal and academic profile to find the best scholarship matches</p>
        </div>
        <button
          onClick={() => onNavigateToTab('dashboard')}
          className="bg-surface hover:bg-surface-variant text-primary border border-outline-variant/60 font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all w-max shrink-0 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Workspace Dashboard
        </button>
      </div>

      {/* Profile Completion */}
      <div className="flex items-center gap-4 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30">
        <div className="w-12 h-12 rounded-full bg-primary-fixed/30 flex items-center justify-center font-black text-primary text-sm">
          {completionPercent}%
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-primary">Profile Completion</span>
            <span className="text-[10px] font-bold text-on-surface-variant">{filledMvspCount}/{mvspFieldsForCompletion.length} required fields</span>
          </div>
          <div className="w-full h-2 bg-outline-variant/30 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${completionPercent}%` }}></div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md animate-sweep">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-extrabold shrink-0">
              <span className="material-symbols-outlined text-base">check_circle</span>
            </div>
            <div>
              <p className="font-semibold text-[13px] text-emerald-700">Profile Saved Successfully!</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Your profile has been saved and your scholarship matches have been updated.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('scholarships')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-all self-start md:self-auto shadow-sm flex items-center gap-1.5"
          >
            <span>View Scholarship Matches</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Steps indicator bar */}
      <div className="premium-glass p-5 rounded-2xl border border-outline-variant/40 shadow-xs">
        <div className="relative flex justify-between items-center max-w-xl mx-auto">
          {/* Progress trace */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-outline-variant/30 rounded-full z-0">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
          </div>

          {[1, 2, 3, 4, 5].map(step => (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                step === currentStep
                  ? 'bg-primary text-white border-primary shadow-sm scale-110'
                  : step < currentStep
                  ? 'bg-status-success text-white border-status-success'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-primary'
              }`}
            >
              {step}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-5 text-center mt-3 max-w-2xl mx-auto text-[9px] font-bold text-outline uppercase tracking-wider">
          <span>1. Identity</span>
          <span>2. Academic</span>
          <span>3. Target</span>
          <span>4. Language</span>
          <span>5. Background</span>
        </div>
      </div>

      {/* Wizard Content Body Layout */}
      <div className="premium-glass p-6 md:p-8 rounded-3xl border border-outline-variant/45 shadow-sm min-h-[380px] flex flex-col justify-between">
        
        {/* STEP 1: Identity & Origins */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-sweep">
            <div className="border-b border-outline-variant/30 pb-4 mb-2">
              <h3 className="font-display text-lg font-black text-primary">Step 1: Identity & Origin Calibration</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Define your citizenship context to feed regional and bi-lateral gates checks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="Amara Diallo"
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Country of Citizenship</label>
                <select
                  value={formData.country}
                  onChange={e => handleChange('country', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  {AFRICAN_COUNTRIES.map(c => (
                    <option key={c.code} value={c.name}>{c.name} ({c.region})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={e => handleChange('date_of_birth', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

            </div>

            {/* Checkbox fields */}
            <div className="pt-4 border-t border-outline-variant/20">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_rural_origin}
                  onChange={() => handleCheckboxChange('is_rural_origin')}
                  className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">Rural Origin / Disadvantaged Region background</span>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Check this if your secondary school or home area is mapped as rural/marginalized (unlocks targeting quotients in AU & Eiffel awards).</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: Academic Record Calibration */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-sweep">
            <div className="border-b border-outline-variant/30 pb-4 mb-2">
              <h3 className="font-display text-lg font-black text-primary">Step 2: Academic Record Alignment</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Enter your academic grades and education level for accurate scholarship matching</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Education Stage Level</label>
                <select
                  value={formData.degree_level}
                  onChange={e => handleChange('degree_level', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="Bachelors">Undergraduate Study (Seeking Bachelors Degree)</option>
                  <option value="Masters">Graduate Study (Holds Bachelors, seeking MSc / MA)</option>
                  <option value="PhD">Doctoral Study (Holds postgraduate, seeking PhD / Dr)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">GPA / Grade System of grading</label>
                <select
                  value={formData.gpa_system}
                  onChange={e => handleChange('gpa_system', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="us4">US standard (0.0 - 4.0 scale)</option>
                  <option value="ngcgpa">Nigeria style CGPA (0.0 - 5.0 scale)</option>
                  <option value="british">UK style degree classifications (First, Upper 2:1, Lower 2:2)</option>
                  <option value="za_pct">South African percentage model (0% - 100%)</option>
                  <option value="mention_fr">French Mention system (0 - 20 Note scales)</option>
                  <option value="belgian_20">Belgian-Congolese system (0 - 20 grade scale)</option>
                  <option value="luso_20">Portuguese-African system (0 - 20 grade scale)</option>
                  <option value="arabic">Arabophone / Egyptian Arabic classifications (امتياز, جيد جداً)</option>
                  <option value="spanish_10">Spanish system (0 - 10 grade scale)</option>
                </select>
              </div>

              {/* Dynamic inputs based on selected system type */}
              {currentGpaConfig.inputType === 'numeric' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">
                    Raw Academic Grade / GPA ({currentGpaConfig.inputType === 'numeric' ? `Range: ${currentGpaConfig.min} - ${currentGpaConfig.max}` : ''})
                  </label>
                  <input
                    type="number"
                    step={currentGpaConfig.step}
                    min={currentGpaConfig.min}
                    max={currentGpaConfig.max}
                    value={formData.gpa}
                    onChange={e => handleChange('gpa', e.target.value)}
                    placeholder={currentGpaConfig.placeholder}
                    className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}

              {(currentGpaConfig.inputType === 'classification' || currentGpaConfig.inputType === 'mention' || currentGpaConfig.inputType === 'arabic_grade') && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Grade Classification / Class Honor</label>
                  <select
                    value={formData.degree_class}
                    onChange={e => handleChange('degree_class', e.target.value)}
                    className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                  >
                    {currentGpaConfig.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Institution of Origin (Last / Current University)</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={e => handleChange('institution', e.target.value)}
                  placeholder="e.g. University of Nairobi / Makerere University"
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>
            
            <p className="text-[10px] text-on-surface-variant leading-relaxed bg-surface-container-low/40 border border-outline-variant/20 p-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-base">architecture</span>
              <span>Our matching engines dynamically normalise your GPA relative to local country-specific grading benchmarks so that you are matched fairly with Chevening, Eiffel, and Mastercard Foundation criteria.</span>
            </p>
          </div>
        )}

        {/* STEP 3: Target Field & Destination preferences */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-sweep">
            <div className="border-b border-outline-variant/30 pb-4 mb-2">
              <h3 className="font-display text-lg font-black text-primary">Step 3: Target Desired Path</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Choose your field of study and preferred study destinations</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Primary Academic Field Of Study</label>
                <select
                  value={formData.field_of_study}
                  onChange={e => handleChange('field_of_study', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  {FIELD_GROUPS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.fields.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* Part A: Destination openness */}
            <div className="pt-4 border-t border-outline-variant/20 space-y-4">
              <h4 className="text-xs font-bold text-on-surface-variant uppercase">Study Destination Preference</h4>
              <p className="text-[10px] text-on-surface-variant">African students typically apply to 4-7 programs across multiple countries. Tell us your preference style.</p>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${formData.destination_openness === 'anywhere' ? 'border-primary bg-primary-fixed/10' : 'border-outline-variant/50 bg-surface hover:bg-surface-variant'}`}>
                <input
                  type="radio"
                  name="destination_openness"
                  value="anywhere"
                  checked={formData.destination_openness === 'anywhere'}
                  onChange={() => handleChange('destination_openness', 'anywhere')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">Open to anywhere with full funding (recommended)</span>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Maximises your scholarship matches — 74% of African students prioritise cost of living over destination</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${formData.destination_openness === 'specific' ? 'border-primary bg-primary-fixed/10' : 'border-outline-variant/50 bg-surface hover:bg-surface-variant'}`}>
                <input
                  type="radio"
                  name="destination_openness"
                  value="specific"
                  checked={formData.destination_openness === 'specific'}
                  onChange={() => handleChange('destination_openness', 'specific')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">I have specific regional preferences</span>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Select the regions you are targeting below</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer select-none transition-all ${formData.destination_openness === 'intra_african' ? 'border-primary bg-primary-fixed/10' : 'border-outline-variant/50 bg-surface hover:bg-surface-variant'}`}>
                <input
                  type="radio"
                  name="destination_openness"
                  value="intra_african"
                  checked={formData.destination_openness === 'intra_african'}
                  onChange={() => handleChange('destination_openness', 'intra_african')}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">Intra-African opportunities only</span>
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">Focus on scholarships at African universities and pan-African programs</p>
                </div>
              </label>
            </div>

            {/* Part B: Region multi-select (visible only when 'specific' is selected) */}
            {formData.destination_openness === 'specific' && (
              <div className="pt-4 border-t border-outline-variant/20 space-y-4 animate-sweep">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase">Select your target regions</h4>
                <p className="text-[10px] text-on-surface-variant">Choose as many regions as you like. Scholarships outside your selections will still appear but rank lower.</p>

                {Object.entries(DESTINATION_REGIONS).map(([group, regions]) => (
                  <div key={group} className="space-y-2">
                    <h5 className="text-[11px] font-extrabold text-primary uppercase tracking-wider">{group}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {regions.map(region => {
                        const countries = resolveDestinationRegion(region);
                        const preview = countries.slice(0, 5);
                        const more = countries.length - 5;
                        return (
                          <label
                            key={region}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer select-none text-xs transition-all ${formData.destination_regions.includes(region) ? 'border-primary bg-primary-fixed/10 text-primary font-bold' : 'border-outline-variant/50 bg-surface text-on-surface hover:bg-surface-variant'}`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.destination_regions.includes(region)}
                              onChange={() => {
                                const updated = formData.destination_regions.includes(region)
                                  ? formData.destination_regions.filter((r: string) => r !== region)
                                  : [...formData.destination_regions, region];
                                handleChange('destination_regions', updated);
                              }}
                              className="rounded accent-primary"
                            />
                            <div className="flex flex-col gap-0.5">
                              <span>{region}</span>
                              <span className="text-[9px] text-outline">{preview.join(', ')}{more > 0 ? ` and ${more} more` : ''}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <label className="flex items-start gap-3 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.include_fully_funded_anywhere}
                    onChange={() => handleCheckboxChange('include_fully_funded_anywhere')}
                    className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-primary">Also show me fully funded opportunities outside my selected regions</span>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">Fully funded scholarships elsewhere will still appear with high match scores</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Language Portfolio */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-sweep">
            <div className="border-b border-outline-variant/30 pb-4 mb-2">
              <h3 className="font-display text-lg font-black text-primary">Step 4: Language Portfolio Credentials</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Certify your multilingual skills to pass global and international gates</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Primary / Native Language</label>
                <input
                  type="text"
                  value={formData.native_language}
                  onChange={e => handleChange('native_language', e.target.value)}
                  placeholder="e.g. English, French, Swahili, Yoruba, Amharic"
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">English Proficiency Test Type</label>
                <select
                  value={formData.english_test_type}
                  onChange={e => handleChange('english_test_type', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="None">None Declared (Seeking Waiver)</option>
                  <option value="Native">Eng-Language University Native waiver</option>
                  <option value="IELTS">IELTS</option>
                  <option value="TOEFL_iBT">TOEFL iBT</option>
                  <option value="Duolingo">Duolingo English Test (DET)</option>
                  <option value="PTE">PTE Academic</option>
                </select>
              </div>

              {formData.english_test_type !== 'None' && formData.english_test_type !== 'Native' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">English Test Score</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.english_score}
                    onChange={e => handleChange('english_score', e.target.value)}
                    placeholder="e.g. 7.5 (IELTS) or 105 (TOEFL)"
                    className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">CEFR French proficiency level</label>
                <select
                  value={formData.french_level}
                  onChange={e => handleChange('french_level', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="None">None — I do not speak French</option>
                  <option value="A1">A1 (Introductory / Débutant)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate - Eiffel Gate minimum)</option>
                  <option value="C1">C1 (Advanced)</option>
                  <option value="C2">C2 (Mastery / Native Francophone)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">CEFR Arabic proficiency level</label>
                <select
                  value={formData.arabic_level}
                  onChange={e => handleChange('arabic_level', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="None">None — I do not speak Arabic</option>
                  <option value="A1">A1 (Débutant)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced / Native)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Portuguese proficiency level</label>
                <select
                  value={formData.portuguese_level}
                  onChange={e => handleChange('portuguese_level', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="None">None — I do not speak Portuguese</option>
                  <option value="A1">A1 (Introductory / Iniciante)</option>
                  <option value="A2">A2 (Elementary)</option>
                  <option value="B1">B1 (Intermediate)</option>
                  <option value="B2">B2 (Upper Intermediate)</option>
                  <option value="C1">C1 (Advanced)</option>
                  <option value="C2">C2 (Mastery / Native Lusophone)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Special Background & Soft Indicators */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-sweep">
            <div className="border-b border-outline-variant/30 pb-4 mb-2">
              <h3 className="font-display text-lg font-black text-primary">Step 5: Background & Personal Context</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Share your background, financial need, and personal experiences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Work Experience (years)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.work_experience_years}
                  onChange={e => handleChange('work_experience_years', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Research Publications Count</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.publications}
                  onChange={e => handleChange('publications', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Household / Financial Need Tier</label>
                <select
                  value={formData.financial_need_level}
                  onChange={e => handleChange('financial_need_level', e.target.value)}
                  className="w-full p-3 bg-surface border border-outline-variant/50 rounded-xl text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
                >
                  <option value="low">Low (Standard educational backing)</option>
                  <option value="medium">Medium (Requires secondary partial grant assistance)</option>
                  <option value="high">High need (Full Mastercard / DAAD equity support eligible)</option>
                </select>
              </div>
            </div>

            {/* Layout checklists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.has_research}
                  onChange={() => handleCheckboxChange('has_research')}
                  className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">I have core academic research experience</span>
                  <p className="text-[10px] text-on-surface-variant">Check this if you have written undergraduate theses or defended independent lab projects.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.has_leadership}
                  onChange={() => handleCheckboxChange('has_leadership')}
                  className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">Holds demonstrable leadership positions</span>
                  <p className="text-[10px] text-on-surface-variant">Unlocks critical weights for UK Chevening and Mastercard leaders-index programs.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.has_community_service}
                  onChange={() => handleCheckboxChange('has_community_service')}
                  className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">Holds community service records</span>
                  <p className="text-[10px] text-on-surface-variant">Involves local NGO initiatives, chiefs endorsements, or student government contributions.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_first_generation}
                  onChange={() => handleCheckboxChange('is_first_generation')}
                  className="mt-0.5 rounded border-outline-variant/60 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-extrabold text-primary">First-generation university student status</span>
                  <p className="text-[10px] text-on-surface-variant">First member of your immediate family tree to attend university (adds substantial weight in global equity slots).</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {stepError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{stepError}</div>
        )}
        {/* Dynamic Nav Actions */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-outline-variant/30">
          <button
            type="button"
            disabled={currentStep === 1 || savingStep}
            onClick={() => handleStepChange(currentStep - 1)}
            className={`flex items-center gap-1 font-bold text-xs py-2.5 px-5 rounded-xl border border-outline-variant/60 text-on-surface-variant bg-surface hover:bg-surface-variant cursor-pointer transition-all ${
              currentStep === 1 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            Go Back
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              disabled={savingStep}
              onClick={() => handleStepChange(currentStep + 1)}
              className="flex items-center gap-1 font-bold text-xs py-2.5 px-6 bg-secondary text-on-secondary hover:opacity-90 rounded-xl cursor-pointer transition-all disabled:opacity-50"
            >
              {savingStep ? 'Saving...' : 'Continue Next'}
              {!savingStep && <span className="material-symbols-outlined text-[16px]">chevron_right</span>}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSave}
              className={`flex items-center gap-2 font-bold text-xs py-3 px-8 bg-primary text-on-primary hover:bg-opacity-95 rounded-xl cursor-pointer transition-all shadow-md ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              {isSubmitting ? 'Saving Profile...' : 'Save Profile & Find Matches'}
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
