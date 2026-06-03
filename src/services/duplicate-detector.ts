import { createHash } from 'crypto';
import { supabaseAdmin } from '../../server';

export function generateFingerprint(name: string | null, provider: string | null, deadline: string | null): string {
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedProvider = (provider || '').toLowerCase().trim();
  const normalizedDeadline = (deadline || '').toLowerCase().trim();

  const hash = createHash('sha256')
    .update(`${normalizedName}||${normalizedProvider}||${normalizedDeadline}`)
    .digest('hex');

  return hash;
}

export async function isDuplicate(fingerprint: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    const { data: botMatch } = await supabaseAdmin
      .from('bot_ingestions')
      .select('fingerprint')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (botMatch) return true;

    return false;
  } catch {
    return false;
  }
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

export async function findSimilar(name: string): Promise<{ existingName: string; similarity: number }[]> {
  const results: { existingName: string; similarity: number }[] = [];
  const target = name.toLowerCase().trim();

  if (!target || !supabaseAdmin) return results;

  try {
    const { data: botData } = await supabaseAdmin
      .from('bot_ingestions')
      .select('extracted_data');

    const { data: scholData } = await supabaseAdmin
      .from('scholarships')
      .select('name');

    const existingNames: string[] = [];

    if (botData) {
      for (const row of botData) {
        const n = row.extracted_data?.name;
        if (n && typeof n === 'string') existingNames.push(n);
      }
    }

    if (scholData) {
      for (const row of scholData) {
        if (row.name && typeof row.name === 'string') existingNames.push(row.name);
      }
    }

    for (const existingName of existingNames) {
      const existing = existingName.toLowerCase().trim();
      const distance = levenshteinDistance(target, existing);
      const maxLen = Math.max(target.length, existing.length);
      const similarity = 1 - distance / maxLen;

      if (similarity > 0.85) {
        results.push({ existingName, similarity });
      }
    }
  } catch {
  }

  return results;
}

export async function deduplicateScholarshipArray(scholarships: any[]): Promise<{ deduplicated: any[]; duplicates_removed: number }> {
  const fingerprintMap = new Map<string, any[]>();

  for (const schol of scholarships) {
    const fp = generateFingerprint(schol.name, schol.provider, schol.deadline);
    if (!fingerprintMap.has(fp)) {
      fingerprintMap.set(fp, []);
    }
    fingerprintMap.get(fp)!.push(schol);
  }

  const deduplicated: any[] = [];
  let duplicates_removed = 0;

  for (const [, group] of fingerprintMap) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
    } else {
      group.sort((a, b) => {
        const scoreA = parseFloat(a.confidence_score) || 0;
        const scoreB = parseFloat(b.confidence_score) || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const fieldsA = countNonEmptyFields(a);
        const fieldsB = countNonEmptyFields(b);
        return fieldsB - fieldsA;
      });

      deduplicated.push(group[0]);
      duplicates_removed += group.length - 1;
    }
  }

  return { deduplicated, duplicates_removed };
}

function countNonEmptyFields(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value) && value.length > 0) count++;
      else if (!Array.isArray(value)) count++;
    }
  }
  return count;
}
