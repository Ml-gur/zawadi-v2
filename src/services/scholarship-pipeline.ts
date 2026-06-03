import * as cron from 'node-cron';
import { crawlAllSources } from './crawler';
import { validateScholarship, validatePipelineOutput } from './scholarship-validator';
import { generateFingerprint, isDuplicate, deduplicateScholarshipArray } from './duplicate-detector';
import { supabaseAdmin } from '../../server';

export interface PipelineSummary {
  pipeline_run_id: string;
  timestamp: string;
  sources_searched: number;
  pages_crawled: number;
  scholarships_found: number;
  duplicates_skipped_within_run: number;
  duplicates_skipped_database: number;
  scam_flagged: number;
  rejected_invalid: number;
  inserted: number;
  duration_seconds: number;
}

export async function runDiscoveryPipeline(): Promise<PipelineSummary> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const pipeline_run_id = 'pipeline-' + timestamp.replace(/:/g, '-');

  console.log(`[Pipeline] Starting run ${pipeline_run_id}`);

  let sources_searched = 0;
  let pages_crawled = 0;
  let scholarships_found = 0;
  let duplicates_skipped_within_run = 0;
  let duplicates_skipped_database = 0;
  let scam_flagged = 0;
  let rejected_invalid = 0;
  let inserted = 0;

  const crawlResults = await crawlAllSources();
  sources_searched = crawlResults.length;
  pages_crawled = crawlResults.filter(r => r.content !== null).length;

  console.log(`[Pipeline] Crawl complete: ${pages_crawled}/${sources_searched} pages with content`);

  const allScholarships: any[] = [];

  console.log(`[Pipeline] Scholarship extraction via AI disabled. Use manual import for scholarship data.`);
  for (const result of crawlResults) {
    if (!result.content) continue;
    // Placeholder for future non-AI extraction logic
  }
  scholarships_found = allScholarships.length;
  console.log(`[Pipeline] Extracted ${scholarships_found} raw scholarship records`);

  const { deduplicated, duplicates_removed } = await deduplicateScholarshipArray(allScholarships);
  duplicates_skipped_within_run = duplicates_removed;
  console.log(`[Pipeline] After within-run dedup: ${deduplicated.length} unique (removed ${duplicates_removed})`);

  for (const schol of deduplicated) {
    const validation = validateScholarship(schol);
    if (!validation.isValid) {
      rejected_invalid++;
      console.log(`[Pipeline] Rejected invalid: "${schol.name}" - ${validation.errors.join(', ')}`);
      continue;
    }

    const fingerprint = generateFingerprint(schol.name, schol.provider, schol.deadline);

    const dup = await isDuplicate(fingerprint);
    if (dup) {
      duplicates_skipped_database++;
      continue;
    }

    if (Array.isArray(schol.scam_flags) && schol.scam_flags.length > 0) {
      scam_flagged++;
    }

    const record: any = {
      extracted_data: schol,
      source_url: schol.source_url || '',
      confidence_score: parseFloat(schol.confidence_score as any) || 0.5,
      scam_flags: schol.scam_flags || [],
      status: 'pending',
      fingerprint,
      pipeline_run_id,
      degree_levels: schol.degree_levels || [],
      host_region: schol.host_region || null,
      countries: schol.countries || [],
    };

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('bot_ingestions')
          .insert(record);
        if (error) {
          console.error(`[Pipeline] Insert error for "${schol.name}":`, error.message);
          continue;
        }
        inserted++;
      } catch (err: any) {
        console.error(`[Pipeline] Insert exception for "${schol.name}":`, err.message);
        continue;
      }
    } else {
      inserted++;
    }
  }

  const duration_seconds = Math.round((Date.now() - startTime) / 1000);

  console.log(`[Pipeline] Summary: ${inserted} inserted, ${duplicates_skipped_within_run} within-run dupes, ${duplicates_skipped_database} DB dupes, ${rejected_invalid} invalid, ${scam_flagged} scam-flagged`);

  const minScholarships = parseInt(process.env.PIPELINE_MIN_SCHOLARSHIPS || '200', 10);
  if (inserted < minScholarships) {
    console.warn(`[Pipeline] WARNING: Only ${inserted} inserted — below minimum threshold of ${minScholarships}. May indicate crawler issues or source changes.`);
  }

  const summary: PipelineSummary = {
    pipeline_run_id,
    timestamp,
    sources_searched,
    pages_crawled,
    scholarships_found,
    duplicates_skipped_within_run,
    duplicates_skipped_database,
    scam_flagged,
    rejected_invalid,
    inserted,
    duration_seconds,
  };

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('pipeline_runs').insert({
        run_id: pipeline_run_id,
        summary,
      });
    } catch (err: any) {
      console.error('[Pipeline] Failed to store run summary:', err.message);
    }
  }

  console.log(`[Pipeline] Completed in ${duration_seconds}s`);
  return summary;
}

export function initializePipelineScheduler(): cron.ScheduledTask | null {
  const schedule = process.env.PIPELINE_SCHEDULE || '0 2 * * *';
  console.log(`[Pipeline] Initializing scheduler with cron: "${schedule}"`);

  if (!cron.validate(schedule)) {
    console.error(`[Pipeline] Invalid cron expression: "${schedule}". Scheduler not started.`);
    return null;
  }

  const task = cron.schedule(schedule, async () => {
    console.log(`[Pipeline] Cron trigger fired at ${new Date().toISOString()}`);
    try {
      await runDiscoveryPipeline();
    } catch (err: any) {
      console.error('[Pipeline] Cron run failed:', err.message);
    }
  });

  console.log('[Pipeline] Scheduler initialized with cron:', schedule);
  return task;
}
