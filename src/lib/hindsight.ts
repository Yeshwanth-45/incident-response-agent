import { HindsightClient } from '@vectorize-io/hindsight-client';
import { getIncident, logMemoryOperation } from './db';
import type {
  Incident,
  RecallOutcome,
  RecalledIncidentSummary,
} from './types';

// ---------------------------------------------------------------------------
// HINDSIGHT MEMORY LAYER
// ---------------------------------------------------------------------------
// The ONLY module allowed to communicate with Hindsight.
// SQLite stores structured incident data; Hindsight stores the agent's
// persistent incident-response experience. If Hindsight is unavailable, the
// app says so instead of pretending local data came from Hindsight.
// ---------------------------------------------------------------------------

function hasRealEnvValue(value?: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const placeholderPattern =
    /^(paste_[a-z0-9_]+|replace_[a-z0-9_]+|your_[a-z0-9_]+|changeme|example|dummy|test)$/i;
  return !placeholderPattern.test(trimmed);
}

const BANK_ID = process.env.HINDSIGHT_BANK_ID || 'incident-response-agent';
const BASE_URL = process.env.HINDSIGHT_BASE_URL;
const API_KEY = process.env.HINDSIGHT_API_KEY;

export function isHindsightConfigured(): boolean {
  if (!hasRealEnvValue(BASE_URL)) return false;
  if (!API_KEY) return true; // local Hindsight needs no key
  return hasRealEnvValue(API_KEY);
}

// ---------------------------------------------------------------------------
// CLIENT + BANK SETUP
// ---------------------------------------------------------------------------

let client: HindsightClient | null = null;

function getClient(): HindsightClient {
  if (!client) {
    client = new HindsightClient({
      baseUrl: BASE_URL!,
      ...(API_KEY ? { apiKey: API_KEY } : {}),
    });
  }
  return client;
}

let bankEnsured = false;

async function ensureBank(): Promise<void> {
  if (bankEnsured || !isHindsightConfigured()) return;
  try {
    await getClient().createBank(BANK_ID, { name: 'Incident Response Agent' });
  } catch {
    // The bank may already exist (e.g. created in the Cloud UI).
  } finally {
    bankEnsured = true;
  }
}

// ---------------------------------------------------------------------------
// RECALL QUERY
// ---------------------------------------------------------------------------

export function buildRecallQuery(incident: {
  service: string;
  title: string;
  description: string;
  logs?: string | null;
}): string {
  const parts = [
    `Service: ${incident.service}`,
    `Symptom: ${incident.title}`,
    incident.description,
    incident.logs ? `Log excerpt: ${incident.logs.slice(0, 500)}` : '',
  ].filter(Boolean);

  return [
    'Find previous incidents relevant to the following current incident.',
    ...parts,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// TURN A RECALLED MEMORY INTO AN INCIDENT SUMMARY
// ---------------------------------------------------------------------------
// Hindsight extracts facts from what we retain, so the recalled text is not
// guaranteed to keep our "Incident ID:" line format. We look for any INC-####
// reference and load the authoritative details from our own database.

function toRecalledIncident(text: string): RecalledIncidentSummary | null {
  const idMatch = text.match(/INC-\d+/i);
  if (!idMatch) return null;

  const incidentId = idMatch[0].toUpperCase();
  const known = getIncident(incidentId);

  if (known) {
    return {
      incidentId,
      title: known.title,
      service: known.service,
      severity: known.severity,
      relevance: 'Related',
      resolutionTime: known.impactDuration,
      rootCauseSummary: known.rootCause,
      runbookId: known.runbookId,
      memoryText: text,
    };
  }

  // Not in the local database: fall back to whatever the text itself says.
  const grab = (re: RegExp) => text.match(re)?.[1]?.trim() || null;
  return {
    incidentId,
    title: grab(/Title:\s*(.+)/i) || 'Previous incident',
    service: grab(/Service:\s*(.+)/i) || 'Unknown service',
    severity:
      (grab(/Severity:\s*(Critical|High|Medium|Low)/i) as RecalledIncidentSummary['severity']) ||
      'Medium',
    relevance: 'Related',
    resolutionTime: grab(/Resolution Duration:\s*(.+)/i),
    rootCauseSummary: grab(/Root Cause:\s*(.+)/i),
    runbookId: grab(/Runbook:\s*([A-Z0-9-]+)/i),
    memoryText: text,
  };
}

// ---------------------------------------------------------------------------
// RECALL SIMILAR INCIDENTS
// ---------------------------------------------------------------------------

export async function recallSimilarIncidents(incident: {
  id: string;
  service: string;
  title: string;
  description: string;
  logs?: string | null;
}): Promise<RecallOutcome> {
  if (!isHindsightConfigured()) {
    logMemoryOperation({
      incidentId: incident.id,
      operation: 'recall',
      bankId: BANK_ID,
      success: false,
      detail: 'Hindsight is not configured (HINDSIGHT_BASE_URL missing).',
    });
    return {
      usedHindsight: false,
      memoriesFound: 0,
      recalledIncidents: [],
      rawMemoryTexts: [],
      error:
        'Hindsight memory is not configured. This investigation uses only current incident data.',
    };
  }

  await ensureBank();
  const query = buildRecallQuery(incident);

  try {
    // Options per the TypeScript client docs: types, maxTokens, budget.
    const result = await getClient().recall(BANK_ID, query, {
      maxTokens: 2048,
      budget: 'mid',
    } as any);

    const rawTexts = (result.results || [])
      .map((item: { text?: string }) => item.text)
      .filter((t): t is string => Boolean(t));

    // Several memories can come from the same incident: keep one per incident,
    // skip the incident currently being investigated.
    const seen = new Set<string>();
    const recalledIncidents: RecalledIncidentSummary[] = [];
    for (const text of rawTexts) {
      const summary = toRecalledIncident(text);
      if (!summary) continue;
      if (summary.incidentId === incident.id) continue;
      if (seen.has(summary.incidentId)) continue;
      seen.add(summary.incidentId);
      recalledIncidents.push(summary);
    }

    // Display only: Hindsight's own ranking decides the order.
    recalledIncidents.forEach((r, idx) => {
      r.relevance = idx === 0 ? 'Matched' : 'Similar';
    });

    logMemoryOperation({
      incidentId: incident.id,
      operation: 'recall',
      bankId: BANK_ID,
      success: true,
      detail: `${recalledIncidents.length} relevant incidents found (${rawTexts.length} memories)`,
    });

    return {
      usedHindsight: true,
      memoriesFound: recalledIncidents.length,
      recalledIncidents,
      rawMemoryTexts: rawTexts,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logMemoryOperation({
      incidentId: incident.id,
      operation: 'recall',
      bankId: BANK_ID,
      success: false,
      detail: errorMessage,
    });
    return {
      usedHindsight: false,
      memoriesFound: 0,
      recalledIncidents: [],
      rawMemoryTexts: [],
      error:
        'Hindsight memory is currently unavailable. The current incident can still be analyzed, but historical memory could not be retrieved.',
    };
  }
}

// ---------------------------------------------------------------------------
// RETAIN INCIDENT MEMORY
// ---------------------------------------------------------------------------

export async function retainIncidentMemory(
  incident: Incident
): Promise<{ success: boolean; error?: string }> {
  if (!isHindsightConfigured()) {
    logMemoryOperation({
      incidentId: incident.id,
      operation: 'retain',
      bankId: BANK_ID,
      success: false,
      detail: 'Hindsight is not configured (HINDSIGHT_BASE_URL missing).',
    });
    return {
      success: false,
      error: 'Hindsight memory is not configured, so this could not be retained.',
    };
  }

  await ensureBank();

  const content = [
    `Incident ID: ${incident.id}`,
    `Title: ${incident.title}`,
    `Service: ${incident.service}`,
    `Severity: ${incident.severity}`,
    incident.description ? `Description: ${incident.description}` : '',
    incident.rootCause ? `Root Cause: ${incident.rootCause}` : '',
    incident.resolution ? `Resolution: ${incident.resolution}` : '',
    incident.runbookId ? `Runbook: ${incident.runbookId}` : '',
    incident.impactDuration ? `Resolution Duration: ${incident.impactDuration}` : '',
    incident.affectedUsers ? `Affected Users: ${incident.affectedUsers}` : '',
    incident.lessonsLearned ? `Lessons Learned: ${incident.lessonsLearned}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    // Options per the TypeScript client docs: timestamp, context, metadata, async.
    await getClient().retain(BANK_ID, content, {
      context: 'incident post-mortem',
      timestamp: incident.resolvedAt ? new Date(incident.resolvedAt) : new Date(),
      metadata: {
        incidentId: incident.id,
        service: incident.service,
        severity: String(incident.severity),
        runbookId: incident.runbookId || '',
      },
      async: false,
    } as any);

    logMemoryOperation({
      incidentId: incident.id,
      operation: 'retain',
      bankId: BANK_ID,
      success: true,
    });
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logMemoryOperation({
      incidentId: incident.id,
      operation: 'retain',
      bankId: BANK_ID,
      success: false,
      detail: errorMessage,
    });
    return { success: false, error: errorMessage || 'Hindsight retain failed.' };
  }
}

// ---------------------------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------------------------
// Uses the documented "list banks" endpoint: GET /v1/default/banks.
// (GET on /v1/default/banks/{bank_id} returns 405 Method Not Allowed.)

export async function hindsightHealthCheck(): Promise<{
  configured: boolean;
  reachable: boolean;
  error?: string;
}> {
  if (!isHindsightConfigured()) {
    return { configured: false, reachable: false };
  }

  try {
    await ensureBank();

    const baseUrl = BASE_URL!.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/v1/default/banks`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text();
      const hint = response.status === 401 ? ' (API key missing or invalid)' : '';
      return {
        configured: true,
        reachable: false,
        error: `HTTP ${response.status}${hint}${body ? ` - ${body.slice(0, 200)}` : ''}`,
      };
    }

    return { configured: true, reachable: true };
  } catch (err: unknown) {
    return {
      configured: true,
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}