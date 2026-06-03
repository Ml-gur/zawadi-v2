import { ALL_DESTINATION_REGIONS } from '../config/matching-config';
import { getCountryByISO2 } from '../lib/country-graph';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_FUNDING_TYPES = ['Full', 'Partial', 'Tuition Only'];

const SUSPICIOUS_FLAGS_WARN = [
  'non_institutional_contact',
  'unverifiable_institution',
  'suspicious_amount',
  'broken_url',
];

export function validateScholarship(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid or empty scholarship object'], warnings: [] };
  }

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Missing required field: name');
  }

  if (!data.provider || typeof data.provider !== 'string' || data.provider.trim().length === 0) {
    errors.push('Missing required field: provider');
  }

  if (!data.countries || !Array.isArray(data.countries) || data.countries.length === 0) {
    errors.push('Missing required field: countries');
  }

  if (!data.degree_levels || !Array.isArray(data.degree_levels) || data.degree_levels.length === 0) {
    errors.push('Missing required field: degree_levels');
  }

  if (Array.isArray(data.scam_flags) && data.scam_flags.includes('application_fee_required')) {
    errors.push('Blocked: scholarship requires application fee');
  }

  if (!data.deadline || typeof data.deadline !== 'string' || data.deadline.trim().length === 0) {
    warnings.push('Missing recommended field: deadline');
  }

  if (!data.apply_url || typeof data.apply_url !== 'string' || data.apply_url.trim().length === 0) {
    warnings.push('Missing recommended field: apply_url');
  }

  if (!data.amount || typeof data.amount !== 'string' || data.amount.trim().length === 0) {
    warnings.push('Missing recommended field: amount');
  }

  if (!data.eligibility || typeof data.eligibility !== 'string' || data.eligibility.trim().length < 50) {
    warnings.push('Missing or too short eligibility (under 50 characters)');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 100) {
    warnings.push('Missing or too short description (under 100 characters)');
  }

  if (data.host_region != null && typeof data.host_region === 'string' && data.host_region.trim().length > 0) {
    if (!ALL_DESTINATION_REGIONS.includes(data.host_region)) {
      warnings.push(`host_region "${data.host_region}" does not match any known destination region`);
    }
  }

  if (data.iso2 != null) {
    const iso2Values = Array.isArray(data.iso2) ? data.iso2 : [data.iso2];
    for (const code of iso2Values) {
      if (typeof code === 'string' && code.trim().length > 0 && !getCountryByISO2(code)) {
        warnings.push(`iso2 code "${code}" does not match any known country`);
      }
    }
  }

  if (data.funding_type != null && typeof data.funding_type === 'string' && data.funding_type.trim().length > 0) {
    if (!VALID_FUNDING_TYPES.includes(data.funding_type)) {
      warnings.push(`funding_type "${data.funding_type}" is not Full, Partial, or Tuition Only`);
    }
  }

  if (data.confidence_score != null && typeof data.confidence_score === 'number' && data.confidence_score < 0.5) {
    warnings.push(`Confidence score ${data.confidence_score} is below 0.5`);
  }

  if (Array.isArray(data.scam_flags)) {
    for (const flag of data.scam_flags) {
      if (SUSPICIOUS_FLAGS_WARN.includes(flag)) {
        warnings.push(`Suspicious flag present: ${flag}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validatePipelineOutput(data: any): {
  total_valid: number;
  total_invalid: number;
  total_warnings: number;
  items: { name: string; result: ValidationResult }[];
} {
  const items: { name: string; result: ValidationResult }[] = [];
  let total_valid = 0;
  let total_invalid = 0;
  let total_warnings = 0;

  if (!data || typeof data !== 'object') {
    return { total_valid: 0, total_invalid: 1, total_warnings: 0, items: [{ name: '(root)', result: { isValid: false, errors: ['Pipeline output is not a valid object'], warnings: [] } }] };
  }

  if (!data.pipeline_run || typeof data.pipeline_run !== 'object') {
    return { total_valid: 0, total_invalid: 1, total_warnings: 0, items: [{ name: '(root)', result: { isValid: false, errors: ['Missing pipeline_run object'], warnings: [] } }] };
  }

  const requiredRunFields = ['timestamp', 'sources_searched', 'pages_crawled', 'scholarships_found', 'duplicates_skipped', 'scam_flagged'];
  const runErrors: string[] = [];
  for (const field of requiredRunFields) {
    if (!(field in data.pipeline_run)) {
      runErrors.push(`Missing pipeline_run.${field}`);
    }
  }
  if (runErrors.length > 0) {
    return { total_valid: 0, total_invalid: 1, total_warnings: 0, items: [{ name: '(root)', result: { isValid: false, errors: runErrors, warnings: [] } }] };
  }

  if (!data.scholarships || !Array.isArray(data.scholarships)) {
    return { total_valid: 0, total_invalid: 1, total_warnings: 0, items: [{ name: '(root)', result: { isValid: false, errors: ['Missing or invalid scholarships array'], warnings: [] } }] };
  }

  for (const schol of data.scholarships) {
    const result = validateScholarship(schol);
    const name = schol?.name || '(unnamed)';
    items.push({ name, result });
    if (result.isValid) total_valid++;
    else total_invalid++;
    total_warnings += result.warnings.length;
  }

  return { total_valid, total_invalid, total_warnings, items };
}
