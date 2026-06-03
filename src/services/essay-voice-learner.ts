import { generateContent, getDefaultConfig, hasAnyKey } from './ai-provider';

const VOICE_ANALYSIS_PROMPT = `You are a writing style analyst. Analyze these writing samples from the same author. Extract their authentic voice profile. Return JSON with: tone as "formal" or "semi-formal" or "conversational", preferred_sentence_length as "short" or "medium" or "long", characteristic_phrases as an array of up to 10 phrases or patterns the author uses, vocabulary_preferences as an object with simple_words_ratio as number, technical_terms as string array, cultural_references as string array, self_promotion_comfort as "low" or "medium" or "high" where low means the author avoids first person achievement claims, narrative_style as "chronological" or "thematic" or "anecdotal", distinctive_voice_description as a 50 word plain English description of what makes this person's writing identifiable.`;

export interface VoiceProfile {
  tone: 'formal' | 'semi-formal' | 'conversational';
  preferred_sentence_length: 'short' | 'medium' | 'long';
  characteristic_phrases: string[];
  vocabulary_preferences: {
    simple_words_ratio: number;
    technical_terms: string[];
    cultural_references: string[];
  };
  self_promotion_comfort: 'low' | 'medium' | 'high';
  narrative_style: 'chronological' | 'thematic' | 'anecdotal';
  distinctive_voice_description: string;
}

export interface EssaySoulProfile {
  user_email: string;
  voice_profile: VoiceProfile | null;
  writing_samples: string[];
  style_notes: string;
  essays_analyzed: number;
  last_updated: string;
  created_at: string;
}

export async function analyzeWritingVoice(user_email: string, samples: string[]): Promise<{ profile: VoiceProfile | null; style_notes: string }> {
  if (!samples.length || !samples.some(s => s.length > 100)) {
    return { profile: null, style_notes: '' };
  }

  const config = getDefaultConfig();
  if (!hasAnyKey(config)) {
    return { profile: null, style_notes: '' };
  }

  try {
    const combined = samples.map((s, i) => `--- Sample ${i + 1} ---\n${s.slice(0, 2000)}`).join('\n\n');
    const result = await generateContent({
      prompt: `${VOICE_ANALYSIS_PROMPT}\n\n${combined}`,
      temperature: 0.3,
      maxOutputTokens: 1024,
    });
    if (!result) return { profile: null, style_notes: '' };

    const text = result.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const styleNotes = parsed.distinctive_voice_description || '';
      return { profile: parsed as VoiceProfile, style_notes: styleNotes };
    }
  } catch {}

  return { profile: null, style_notes: '' };
}

export function generateStyleSummary(profile: VoiceProfile | null, essayCount: number): string {
  if (!profile) return 'No voice profile yet. Write more essays to build your style profile.';
  const parts: string[] = [];
  parts.push(`Your essays tend to be ${profile.tone} and use ${profile.preferred_sentence_length} sentence structures.`);
  if (profile.narrative_style) parts.push(`You typically write in a ${profile.narrative_style} narrative style.`);
  if (profile.vocabulary_preferences?.cultural_references?.length) {
    parts.push(`Your writing draws from ${profile.vocabulary_preferences.cultural_references.slice(0, 3).join(', ')}.`);
  }
  parts.push(profile.distinctive_voice_description || '');
  parts.push(`Based on ${essayCount} essay${essayCount === 1 ? '' : 's'} analyzed.`);
  return parts.filter(Boolean).join(' ');
}
