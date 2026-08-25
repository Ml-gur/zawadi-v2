// src/components/StudentProfile.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, BadgeCheck, GraduationCap, Award } from 'lucide-react';
import { AFRICAN_COUNTRIES, GPA_SYSTEM_CONFIGS, FIELD_GROUPS, GpaSystem, DESTINATION_REGIONS } from '../config/matching-config';
import { resolveDestinationRegion } from '../lib/country-graph';
import { SEO } from './SEO';

const labelCls = 'block text-ed-body-sm font-medium text-off-black-ink mb-1.5';
const helperCls = 'text-ed-caption normal-case tracking-normal text-graphite';
const fieldCls =
  'w-full px-4 py-3 min-h-[44px] bg-pure-white border border-ash rounded-lg text-ed-body-sm text-off-black-ink placeholder:text-stone focus:border-graphite outline-none transition-colors';
const selectCls = `${fieldCls} cursor-pointer`;

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
    country: u.country || '',
    age: u.age ?? '',
    gender: u.gender || '',
    is_rural_origin: !!u.is_rural_origin,

    // Step 2: Academic Record
    degree_level: u.degree_level || '',
    gpa_system: (u.gpa_system || 'us4') as GpaSystem,
    gpa: u.gpa !== undefined ? u.gpa : '',
    degree_class: u.degree_class || '',
    institution: u.institution || '',

    // Step 3: Target & Destination
    field_of_study: u.field_of_study || '',
    target_fields: u.target_fields || [],
    destination_openness: u.destination_openness || (u.study_country_preference ? 'specific' : 'anywhere'),
    destination_regions: u.destination_regions || [],
    include_fully_funded_anywhere: u.include_fully_funded_anywhere !== false,

    // Step 4: Languages
    native_language: u.native_language || '',
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
      const sanitized = { ...formData };
      const numericFields = ['gpa', 'work_experience_years', 'publications'];
      for (const key of numericFields) {
        if (sanitized[key] === '' || sanitized[key] === undefined || sanitized[key] === null) {
          sanitized[key] = null;
        }
      }
      await onUpdateProfile(sanitized);
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
    <div className="bg-pure-white text-off-black-ink max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20">
      <SEO title="Your Profile | Techsari" description="Confirm your academic details so the matching engine checks exact eligibility rules for you." path="/studentprofile" noindex />

      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-ed-eyebrow font-medium uppercase tracking-widest text-graphite block mb-2">Your profile</span>
            <h2 className="text-ed-h1-sm text-off-black-ink">Academic Persona Configuration</h2>
            <p className={helperCls + ' mt-1'}>Set up your personal and academic profile to find the best scholarship matches</p>
          </div>
          <button
            onClick={() => onNavigateToTab('dashboard')}
            className="inline-flex items-center gap-1.5 rounded-full border border-ash px-5 min-h-[44px] text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-all w-max shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Workspace Dashboard
          </button>
        </div>

        {/* Profile Completion */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-ed-body-sm font-medium text-off-black-ink">Profile Completion</span>
            <span className="text-ed-caption text-graphite">{completionPercent}% · {filledMvspCount}/{mvspFieldsForCompletion.length} required fields</span>
          </div>
          <div className="w-full h-1 bg-ash rounded-full overflow-hidden">
            <div className="h-full bg-electric-lime rounded-full transition-all duration-500" style={{ width: `${completionPercent}%` }}></div>
          </div>
        </div>

        {successMsg && (
          <div className="p-5 bg-electric-lime/25 border border-off-black-ink/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-sweep">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-electric-lime flex items-center justify-center text-off-black-ink shrink-0">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-ed-body-sm text-off-black-ink">Profile Saved Successfully!</p>
                <p className="text-ed-caption normal-case tracking-normal text-graphite mt-0.5">Your profile has been saved and your scholarship matches have been updated.</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('scholarships')}
              className="inline-flex items-center gap-1.5 rounded-full bg-off-black-ink text-pure-white px-5 min-h-[44px] text-ed-caption font-medium hover:bg-deep-charcoal active:scale-[0.98] transition-all self-start md:self-auto cursor-pointer"
            >
              <span>View Scholarship Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Steps indicator bar */}
        <div className="bg-pure-white border border-ash rounded-ed p-5">
          <div className="relative flex justify-between items-center max-w-xl mx-auto">
            {/* Progress trace */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-ash z-0">
              <div
                className="h-full bg-electric-lime transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
              ></div>
            </div>

            {[1, 2, 3, 4, 5].map(step => (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                  step === currentStep
                    ? 'bg-electric-lime border-off-black-ink text-off-black-ink scale-110'
                    : step < currentStep
                    ? 'bg-off-black-ink text-pure-white border-off-black-ink'
                    : 'bg-parchment text-graphite border-ash hover:border-graphite'
                }`}
              >
                {step}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 text-center mt-3 max-w-2xl mx-auto text-ed-eyebrow font-medium text-graphite uppercase tracking-wider">
            <span>1. Identity</span>
            <span>2. Academic</span>
            <span>3. Target</span>
            <span>4. Language</span>
            <span>5. Background</span>
          </div>
        </div>

        {/* Wizard Content Body Layout */}
        <div className="bg-parchment border border-ash rounded-ed p-6 md:p-10 min-h-[380px] flex flex-col justify-between">

          {/* STEP 1: Identity & Origins */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-sweep">
              <div className="border-b border-ash pb-4 mb-2">
                <h3 className="text-ed-sub font-medium text-off-black-ink">Step 1: Identity & Origin Calibration</h3>
                <p className={helperCls + ' mt-1'}>Define your citizenship context to feed regional and bi-lateral gates checks</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Amara Diallo"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Country of Citizenship</label>
                  <select
                    value={formData.country}
                    onChange={e => handleChange('country', e.target.value)}
                    className={selectCls}
                  >
                    {AFRICAN_COUNTRIES.map(c => (
                      <option key={c.code} value={c.name}>{c.name} ({c.region})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Age</label>
                  <input
                    type="number"
                    min={16}
                    max={80}
                    value={formData.age || ''}
                    onChange={e => handleChange('age', e.target.value === '' ? null : Number(e.target.value))}
                    className={fieldCls}
                    placeholder="e.g. 22"
                  />
                </div>

                <div>
                  <label className={labelCls}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => handleChange('gender', e.target.value)}
                    className={selectCls}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

              </div>

              {/* Checkbox fields */}
              <div className="pt-4 border-t border-ash">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_rural_origin}
                    onChange={() => handleCheckboxChange('is_rural_origin')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">Rural Origin / Disadvantaged Region background</span>
                    <p className={helperCls + ' leading-relaxed'}>Check this if your secondary school or home area is mapped as rural/marginalized (unlocks targeting quotients in AU & Eiffel awards).</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Academic Record Calibration */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-sweep">
              <div className="border-b border-ash pb-4 mb-2">
                <h3 className="text-ed-sub font-medium text-off-black-ink">Step 2: Academic Record Alignment</h3>
                <p className={helperCls + ' mt-1'}>Enter your academic grades and education level for accurate scholarship matching</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Education Stage Level</label>
                  <select
                    value={formData.degree_level}
                    onChange={e => handleChange('degree_level', e.target.value)}
                    className={selectCls}
                  >
                    <option value="Bachelors">Undergraduate Study (Seeking Bachelors Degree)</option>
                    <option value="Masters">Graduate Study (Holds Bachelors, seeking MSc / MA)</option>
                    <option value="PhD">Doctoral Study (Holds postgraduate, seeking PhD / Dr)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>GPA / Grade System of grading</label>
                  <select
                    value={formData.gpa_system}
                    onChange={e => handleChange('gpa_system', e.target.value)}
                    className={selectCls}
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
                    <label className={labelCls}>
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
                      className={fieldCls}
                    />
                  </div>
                )}

                {(currentGpaConfig.inputType === 'classification' || currentGpaConfig.inputType === 'mention' || currentGpaConfig.inputType === 'arabic_grade') && (
                  <div>
                    <label className={labelCls}>Grade Classification / Class Honor</label>
                    <select
                      value={formData.degree_class}
                      onChange={e => handleChange('degree_class', e.target.value)}
                      className={selectCls}
                    >
                      {currentGpaConfig.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelCls}>Institution of Origin (Last / Current University)</label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={e => handleChange('institution', e.target.value)}
                    placeholder="e.g. University of Nairobi / Makerere University"
                    className={fieldCls}
                  />
                </div>
              </div>

              <p className={helperCls + ' leading-relaxed bg-pure-white border border-ash p-4 rounded-lg flex items-start gap-3'}>
                <GraduationCap className="w-4 h-4 text-graphite shrink-0 mt-0.5" />
                <span>Our matching engines dynamically normalise your GPA relative to local country-specific grading benchmarks so that you are matched fairly with Chevening, Eiffel, and Mastercard Foundation criteria.</span>
              </p>
            </div>
          )}

          {/* STEP 3: Target Field & Destination preferences */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-sweep">
              <div className="border-b border-ash pb-4 mb-2">
                <h3 className="text-ed-sub font-medium text-off-black-ink">Step 3: Target Desired Path</h3>
                <p className={helperCls + ' mt-1'}>Choose your field of study and preferred study destinations</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Primary Academic Field Of Study</label>
                  <select
                    value={formData.field_of_study}
                    onChange={e => handleChange('field_of_study', e.target.value)}
                    className={selectCls}
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
              <div className="pt-4 border-t border-ash space-y-4">
                <h4 className="text-ed-body-sm font-medium text-off-black-ink">Study Destination Preference</h4>
                <p className={helperCls}>African students typically apply to 4-7 programs across multiple countries. Tell us your preference style.</p>

                <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer select-none transition-all ${formData.destination_openness === 'anywhere' ? 'bg-electric-lime border-off-black-ink' : 'bg-pure-white border-ash hover:border-graphite'}`}>
                  <input
                    type="radio"
                    name="destination_openness"
                    value="anywhere"
                    checked={formData.destination_openness === 'anywhere'}
                    onChange={() => handleChange('destination_openness', 'anywhere')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">Open to anywhere with full funding (recommended)</span>
                    <p className={helperCls + ' leading-relaxed'}>Maximises your scholarship matches — 74% of African students prioritise cost of living over destination</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer select-none transition-all ${formData.destination_openness === 'specific' ? 'bg-electric-lime border-off-black-ink' : 'bg-pure-white border-ash hover:border-graphite'}`}>
                  <input
                    type="radio"
                    name="destination_openness"
                    value="specific"
                    checked={formData.destination_openness === 'specific'}
                    onChange={() => handleChange('destination_openness', 'specific')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">I have specific regional preferences</span>
                    <p className={helperCls + ' leading-relaxed'}>Select the regions you are targeting below</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer select-none transition-all ${formData.destination_openness === 'intra_african' ? 'bg-electric-lime border-off-black-ink' : 'bg-pure-white border-ash hover:border-graphite'}`}>
                  <input
                    type="radio"
                    name="destination_openness"
                    value="intra_african"
                    checked={formData.destination_openness === 'intra_african'}
                    onChange={() => handleChange('destination_openness', 'intra_african')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">Intra-African opportunities only</span>
                    <p className={helperCls + ' leading-relaxed'}>Focus on scholarships at African universities and pan-African programs</p>
                  </div>
                </label>
              </div>

              {/* Part B: Region multi-select (visible only when 'specific' is selected) */}
              {formData.destination_openness === 'specific' && (
                <div className="pt-4 border-t border-ash space-y-4 animate-sweep">
                  <h4 className="text-ed-body-sm font-medium text-off-black-ink">Select your target regions</h4>
                  <p className={helperCls}>Choose as many regions as you like. Scholarships outside your selections will still appear but rank lower.</p>

                  {Object.entries(DESTINATION_REGIONS).map(([group, regions]) => (
                    <div key={group} className="space-y-2">
                      <h5 className="text-ed-caption font-medium text-off-black-ink uppercase tracking-wider">{group}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {regions.map(region => {
                          const countries = resolveDestinationRegion(region);
                          const preview = countries.slice(0, 5);
                          const more = countries.length - 5;
                          return (
                            <label
                              key={region}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer select-none text-ed-body-sm transition-all ${formData.destination_regions.includes(region) ? 'bg-electric-lime border-off-black-ink text-off-black-ink font-medium' : 'bg-pure-white border-ash text-off-black-ink hover:border-graphite'}`}
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
                                className="accent-electric-lime"
                              />
                              <div className="flex flex-col gap-0.5">
                                <span>{region}</span>
                                <span className="text-ed-caption normal-case tracking-normal text-graphite">{preview.join(', ')}{more > 0 ? ` and ${more} more` : ''}</span>
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
                      className="mt-1 accent-electric-lime"
                    />
                    <div>
                      <span className="text-ed-body-sm font-medium text-off-black-ink">Also show me fully funded opportunities outside my selected regions</span>
                      <p className={helperCls + ' leading-relaxed'}>Fully funded scholarships elsewhere will still appear with high match scores</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Language Portfolio */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-sweep">
              <div className="border-b border-ash pb-4 mb-2">
                <h3 className="text-ed-sub font-medium text-off-black-ink">Step 4: Language Portfolio Credentials</h3>
                <p className={helperCls + ' mt-1'}>Certify your multilingual skills to pass global and international gates</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Primary / Native Language</label>
                  <input
                    type="text"
                    value={formData.native_language}
                    onChange={e => handleChange('native_language', e.target.value)}
                    placeholder="e.g. English, French, Swahili, Yoruba, Amharic"
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>English Proficiency Test Type</label>
                  <select
                    value={formData.english_test_type}
                    onChange={e => handleChange('english_test_type', e.target.value)}
                    className={selectCls}
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
                    <label className={labelCls}>English Test Score</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.english_score}
                      onChange={e => handleChange('english_score', e.target.value)}
                      placeholder="e.g. 7.5 (IELTS) or 105 (TOEFL)"
                      className={fieldCls}
                    />
                  </div>
                )}

                <div>
                  <label className={labelCls}>CEFR French proficiency level</label>
                  <select
                    value={formData.french_level}
                    onChange={e => handleChange('french_level', e.target.value)}
                    className={selectCls}
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
                  <label className={labelCls}>CEFR Arabic proficiency level</label>
                  <select
                    value={formData.arabic_level}
                    onChange={e => handleChange('arabic_level', e.target.value)}
                    className={selectCls}
                  >
                    <option value="None">None — I do not speak Arabic</option>
                    <option value="A1">A1 (Débutant)</option>
                    <option value="B1">B1 (Intermediate)</option>
                    <option value="B2">B2 (Upper Intermediate)</option>
                    <option value="C1">C1 (Advanced / Native)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Portuguese proficiency level</label>
                  <select
                    value={formData.portuguese_level}
                    onChange={e => handleChange('portuguese_level', e.target.value)}
                    className={selectCls}
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
              <div className="border-b border-ash pb-4 mb-2">
                <h3 className="text-ed-sub font-medium text-off-black-ink">Step 5: Background & Personal Context</h3>
                <p className={helperCls + ' mt-1'}>Share your background, financial need, and personal experiences</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Work Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.work_experience_years}
                    onChange={e => handleChange('work_experience_years', e.target.value)}
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Research Publications Count</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.publications}
                    onChange={e => handleChange('publications', e.target.value)}
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Household / Financial Need Tier</label>
                  <select
                    value={formData.financial_need_level}
                    onChange={e => handleChange('financial_need_level', e.target.value)}
                    className={selectCls}
                  >
                    <option value="low">Low (Standard educational backing)</option>
                    <option value="medium">Medium (Partial financial assistance needed)</option>
                    <option value="high">High need (Full funding support eligible)</option>
                  </select>
                </div>
              </div>

              {/* Layout checklists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-ash">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.has_research}
                    onChange={() => handleCheckboxChange('has_research')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">I have core academic research experience</span>
                    <p className={helperCls}>Check this if you have written undergraduate theses or defended independent lab projects.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.has_leadership}
                    onChange={() => handleCheckboxChange('has_leadership')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">Holds demonstrable leadership positions</span>
                    <p className={helperCls}>Unlocks critical weights for UK Chevening and Mastercard leaders-index programs.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.has_community_service}
                    onChange={() => handleCheckboxChange('has_community_service')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">Holds community service records</span>
                    <p className={helperCls}>Involves local NGO initiatives, chiefs endorsements, or student government contributions.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_first_generation}
                    onChange={() => handleCheckboxChange('is_first_generation')}
                    className="mt-1 accent-electric-lime"
                  />
                  <div>
                    <span className="text-ed-body-sm font-medium text-off-black-ink">First-generation university student status</span>
                    <p className={helperCls}>First member of your immediate family tree to attend university (adds substantial weight in global equity slots).</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {stepError && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-ed-caption text-error font-medium">{stepError}</div>
          )}
          {/* Dynamic Nav Actions */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-ash">
            <button
              type="button"
              disabled={currentStep === 1 || savingStep}
              onClick={() => handleStepChange(currentStep - 1)}
              className={`inline-flex items-center gap-1 rounded-full border border-ash px-5 min-h-[44px] text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-all cursor-pointer ${
                currentStep === 1 ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Go Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                disabled={savingStep}
                onClick={() => handleStepChange(currentStep + 1)}
                className="inline-flex items-center gap-1 rounded-full bg-electric-lime px-6 min-h-[48px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {savingStep ? 'Saving...' : 'Continue Next'}
                {!savingStep && <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSave}
                className={`inline-flex items-center gap-2 rounded-full bg-off-black-ink text-pure-white px-6 min-h-[48px] text-ed-body-sm font-medium hover:bg-deep-charcoal active:scale-[0.98] transition-all cursor-pointer ${
                  isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <Award className="w-4 h-4" />
                {isSubmitting ? 'Saving Profile...' : 'Save Profile & Find Matches'}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
