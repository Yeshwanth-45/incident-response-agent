'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  SeverityBadge,
  StatusBadge,
  timeAgo,
} from '@/components/Badges';
import { RunbookDetail } from '@/components/RunbookDetail';
import {
  Send,
  Sparkles,
  BookOpen,
  FileText,
  ListTree,
  Link2,
  ArrowRight,
  Brain,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type {
  AgentAnalysis,
  ChatMessage,
  Incident,
  Postmortem,
  RecallOutcome,
  Runbook,
  TimelineEvent,
} from '@/lib/types';

type Tab =
  | 'Investigation'
  | 'Related Incidents'
  | 'Logs'
  | 'Timeline';

export default function IncidentPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const autoInvestigate =
    searchParams.get('autoInvestigate') === '1';

  const [incident, setIncident] =
    useState<Incident | null>(null);
  const [timeline, setTimeline] =
    useState<TimelineEvent[]>([]);
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);
  const [postmortem, setPostmortem] =
    useState<Postmortem | null>(null);
  const [recall, setRecall] =
    useState<RecallOutcome | null>(null);
  const [analysis, setAnalysis] =
    useState<AgentAnalysis | null>(null);
  const [runbooks, setRunbooks] =
    useState<Runbook[]>([]);
  const [tab, setTab] =
    useState<Tab>('Investigation');
  const [loading, setLoading] =
    useState(false);
  const [loadingStage, setLoadingStage] =
    useState('');
  const [question, setQuestion] =
    useState('');
  const [error, setError] =
    useState<string | null>(null);

  const hasAutoStarted =
    useRef(false);

  async function loadIncident() {
    try {
      const res = await fetch(
        `/api/incidents/${id}`
      );

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      setIncident(data.incident);
      setTimeline(data.timeline || []);
      setMessages(data.chatMessages || []);
      setPostmortem(data.postmortem || null);
    } catch {
      setError('Could not load the incident.');
    }
  }

  async function loadRunbooks() {
    try {
      const res = await fetch('/api/runbooks');

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setRunbooks(data.runbooks || []);
    } catch {
      // Runbooks are supplementary to the investigation.
    }
  }

  useEffect(() => {
    void loadIncident();
    void loadRunbooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (
      autoInvestigate &&
      incident &&
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      void runInvestigation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInvestigate, incident]);

  async function runInvestigation() {
    setLoading(true);
    setError(null);
    setLoadingStage(
      'Searching Hindsight for previous incidents…'
    );

    try {
      const res = await fetch(
        `/api/incidents/${id}/investigate`,
        {
          method: 'POST',
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || 'Investigation failed.'
        );
        return;
      }

      setLoadingStage(
        'Analyzing current evidence with historical context…'
      );

      setRecall(data.recall);
      setAnalysis(data.analysis);

      await loadIncident();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Investigation failed.';

      setError(message);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  }

  async function askFollowUp() {
    if (!question.trim()) {
      return;
    }

    const q = question.trim();

    setQuestion('');
    setLoading(true);
    setLoadingStage(
      'Checking historical memory and generating response…'
    );
    setError(null);

    try {
      const res = await fetch(
        `/api/incidents/${id}/follow-up`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: q,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || 'Follow-up failed.'
        );
        return;
      }

      setRecall(data.recall);
      setAnalysis(data.analysis);

      await loadIncident();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Follow-up failed.';

      setError(message);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  }

  if (!incident) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Loading incident…
      </div>
    );
  }

  if (
    incident.status === 'Resolved' &&
    !autoInvestigate
  ) {
    return (
      <HistoricalIncidentView
        incident={incident}
        timeline={timeline}
        postmortem={postmortem}
        runbook={
          runbooks.find(
            (r) => r.id === incident.runbookId
          ) || null
        }
      />
    );
  }

  const suggestedRunbook = runbooks.find(
    (r) =>
      r.id === analysis?.suggestedRunbookId ||
      r.id === incident.runbookId
  );

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-start justify-between border-b border-slate-200 bg-white px-8 py-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">
              {incident.id}
            </h1>

            <StatusBadge status={incident.status} />
          </div>

          <p className="mt-0.5 text-sm text-slate-600">
            {incident.title}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {timeAgo(incident.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SeverityBadge
            severity={incident.severity}
          />

          {incident.status !== 'Resolved' && (
            <Link
              href={`/incidents/${incident.id}/postmortem`}
              className="btn-secondary"
            >
              Resolve &amp; Review
            </Link>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-white px-8">
        {(
          [
            'Investigation',
            'Related Incidents',
            'Logs',
            'Timeline',
          ] as Tab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {tab === 'Investigation' && (
            <div className="mx-auto max-w-3xl">
              {messages.length === 0 &&
                !loading && (
                  <button
                    onClick={() => void runInvestigation()}
                    className="btn-primary"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start Investigation
                  </button>
                )}

              <div className="space-y-4">
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    message={m}
                  />
                ))}

                {loading && (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-500 animate-fade-in">
                    <span className="h-2 w-2 animate-ping rounded-full bg-brand-600" />
                    <span>
                      {loadingStage ||
                        'Working…'}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              {analysis && (
                <AnalysisEvidencePanel
                  analysis={analysis}
                  recall={recall}
                />
              )}

              {messages.length > 0 && (
                <div className="sticky bottom-0 mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
                  <input
                    className="flex-1 border-none px-3 py-2 text-sm focus:outline-none"
                    placeholder="Ask a follow-up question…"
                    value={question}
                    onChange={(e) =>
                      setQuestion(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();
                        void askFollowUp();
                      }
                    }}
                    disabled={loading}
                  />

                  <button
                    onClick={() =>
                      void askFollowUp()
                    }
                    disabled={
                      loading ||
                      !question.trim()
                    }
                    className="btn-primary !px-3 !py-2"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'Related Incidents' && (
            <RelatedIncidentsTab
              recall={recall}
            />
          )}

          {tab === 'Logs' && (
            <div className="mx-auto max-w-3xl">
              {incident.logs ? (
                <pre className="whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
                  {incident.logs}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">
                  No logs were attached to this
                  incident.
                </p>
              )}
            </div>
          )}

          {tab === 'Timeline' && (
            <div className="mx-auto max-w-3xl">
              <ol className="space-y-4 border-l border-slate-200 pl-4">
                {timeline.map((ev) => (
                  <li
                    key={ev.id}
                    className="relative"
                  >
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />

                    <p className="text-sm font-medium text-slate-800">
                      {ev.message}
                    </p>

                    <p className="text-xs text-slate-400">
                      {new Date(
                        ev.createdAt
                      ).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 lg:block">
          <MemoryPanel recall={recall} />

          {suggestedRunbook && (
            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-violet-600" />
                Runbook Suggestion
              </div>

              <p className="text-sm font-medium text-slate-800">
                {suggestedRunbook.id}
              </p>

              <p className="mb-2 text-xs text-slate-500">
                {suggestedRunbook.description}
              </p>

              <Link
                href={`/runbooks/${suggestedRunbook.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                View Runbook
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function AnalysisEvidencePanel({
  analysis,
  recall,
}: {
  analysis: AgentAnalysis;
  recall: RecallOutcome | null;
}) {
  const hasHistoricalContext =
    analysis.historicalContext.length > 0;

  return (
    <div className="mt-6 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />

          <h3 className="text-sm font-semibold text-slate-900">
            Agent Reasoning Context
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Evidence
              </span>
            </div>

            {analysis.evidence.length > 0 ? (
              <ul className="space-y-1.5">
                {analysis.evidence.map(
                  (item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="text-xs text-slate-700"
                    >
                      • {item}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                No structured evidence returned.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-brand-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-4 w-4 text-brand-600" />

              <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Historical Context
              </span>
            </div>

            {hasHistoricalContext ? (
              <ul className="space-y-1.5">
                {analysis.historicalContext.map(
                  (item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="text-xs text-slate-700"
                    >
                      • {item}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                No historical context was used.
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <div className="mb-1 flex items-center gap-2">
            {hasHistoricalContext ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}

            <span className="text-xs font-semibold text-slate-700">
              Memory Influence
            </span>
          </div>

          <p className="text-xs text-slate-600">
            {hasHistoricalContext &&
            recall?.usedHindsight
              ? `The agent used historical Hindsight context from ${recall.memoriesFound} relevant memory result(s) while analyzing this incident.`
              : recall?.usedHindsight
                ? 'Hindsight was searched, but no relevant historical context influenced the analysis.'
                : 'Historical Hindsight context was not available for this analysis.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />

          <h3 className="text-sm font-semibold text-slate-900">
            Risks to Verify
          </h3>
        </div>

        {analysis.risksToVerify.length > 0 ? (
          <ul className="space-y-1.5">
            {analysis.risksToVerify.map(
              (risk, index) => (
                <li
                  key={`${risk}-${index}`}
                  className="text-xs text-slate-700"
                >
                  • {risk}
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">
            No additional verification risks were
            returned.
          </p>
        )}
      </div>
    </div>
  );
}

type HistoricalTab =
  | 'Overview'
  | 'Timeline'
  | 'Logs'
  | 'Runbook'
  | 'Post-mortem';

function HistoricalIncidentView({
  incident,
  timeline,
  postmortem,
  runbook,
}: {
  incident: Incident;
  timeline: TimelineEvent[];
  postmortem: Postmortem | null;
  runbook: Runbook | null;
}) {
  const [tab, setTab] =
    useState<HistoricalTab>('Overview');

  return (
    <div>
      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">
            {incident.id}
          </h1>

          <StatusBadge status="Resolved" />
        </div>

        <p className="mt-0.5 text-sm text-slate-600">
          {incident.title}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          Resolved{' '}
          {incident.resolvedAt
            ? new Date(
                incident.resolvedAt
              ).toLocaleDateString()
            : ''}{' '}
          · {incident.impactDuration}
        </p>
      </div>

      <div className="flex border-b border-slate-200 bg-white px-8">
        {(
          [
            'Overview',
            'Timeline',
            'Logs',
            'Runbook',
            'Post-mortem',
          ] as HistoricalTab[]
        ).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === t
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-4xl p-8">
        {tab === 'Overview' && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Incident Details
              </h3>

              <dl className="space-y-2 text-sm">
                <Row
                  label="Service"
                  value={incident.service}
                />

                <Row
                  label="Severity"
                  value={
                    <SeverityBadge
                      severity={incident.severity}
                    />
                  }
                />

                <Row
                  label="Description"
                  value={incident.description}
                />
              </dl>
            </div>

            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Impact
              </h3>

              <dl className="space-y-2 text-sm">
                <Row
                  label="Duration"
                  value={
                    incident.impactDuration ||
                    '—'
                  }
                />

                <Row
                  label="Affected Users"
                  value={
                    incident.affectedUsers ||
                    '—'
                  }
                />

                <Row
                  label="Status"
                  value={
                    <StatusBadge status="Resolved" />
                  }
                />
              </dl>
            </div>

            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-red-700">
                Root Cause
              </h3>

              <p className="text-sm text-slate-700">
                {incident.rootCause}
              </p>
            </div>

            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-green-700">
                Resolution
              </h3>

              <p className="text-sm text-slate-700">
                {incident.resolution}
              </p>
            </div>

            {runbook && (
              <div className="card">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Runbook Used
                </h3>

                <Link
                  href={`/runbooks/${runbook.id}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {runbook.id}
                </Link>

                <p className="text-xs text-slate-500">
                  {runbook.name}
                </p>
              </div>
            )}

            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                Lessons Learned
              </h3>

              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {incident.lessonsLearned ||
                  '—'}
              </p>
            </div>
          </div>
        )}

        {tab === 'Timeline' && (
          <ol className="space-y-4 border-l border-slate-200 pl-4">
            {timeline.map((ev) => (
              <li
                key={ev.id}
                className="relative"
              >
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />

                <p className="text-sm font-medium text-slate-800">
                  {ev.message}
                </p>

                <p className="text-xs text-slate-400">
                  {new Date(
                    ev.createdAt
                  ).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}

        {tab === 'Logs' && (
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            {incident.logs ||
              'No logs were recorded for this incident.'}
          </pre>
        )}

        {tab === 'Runbook' &&
          (runbook ? (
            <RunbookDetail runbook={runbook} />
          ) : (
            <p className="text-sm text-slate-500">
              No runbook was associated with this
              incident.
            </p>
          ))}

        {tab === 'Post-mortem' &&
          (postmortem ? (
            <div className="card space-y-3">
              <Row
                label="Root Cause"
                value={postmortem.rootCause}
              />

              <Row
                label="Resolution Steps"
                value={
                  <span className="whitespace-pre-wrap">
                    {postmortem.resolutionSteps}
                  </span>
                }
              />

              <Row
                label="Runbook Used"
                value={
                  postmortem.runbookUsed ||
                  '—'
                }
              />

              <Row
                label="Lessons Learned"
                value={
                  <span className="whitespace-pre-wrap">
                    {postmortem.lessonsLearned}
                  </span>
                }
              />

              {postmortem.additionalNotes && (
                <Row
                  label="Additional Notes"
                  value={
                    postmortem.additionalNotes
                  }
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No post-mortem was recorded for this
              incident.
            </p>
          ))}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd className="text-sm text-slate-700">
        {value}
      </dd>
    </div>
  );
}

function ChatBubble({
  message,
}: {
  message: ChatMessage;
}) {
  if (message.role === 'user') {
    return (
      <div className="animate-fade-in rounded-xl bg-brand-600/5 px-4 py-3 text-sm text-slate-800">
        <p className="mb-1 text-xs font-semibold text-brand-700">
          You
        </p>

        {message.content}
      </div>
    );
  }

  return (
    <div className="animate-fade-in rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
      <p className="mb-1 text-xs font-semibold text-slate-500">
        Incident Response Agent
      </p>

      <div className="whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  );
}

function MemoryPanel({
  recall,
}: {
  recall: RecallOutcome | null;
}) {
  if (!recall) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand-600" />

          <h3 className="text-sm font-semibold text-slate-900">
            Hindsight Memory
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          Start the investigation to search
          persistent incident memory.
        </p>
      </div>
    );
  }

  if (!recall.usedHindsight) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-600" />

          <h3 className="text-sm font-semibold text-slate-900">
            Hindsight Memory
          </h3>
        </div>

        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {recall.error}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand-600" />

          <h3 className="text-sm font-semibold text-slate-900">
            Similar Incidents Found
          </h3>
        </div>

        <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-xs font-medium text-brand-700">
          {recall.memoriesFound}
        </span>
      </div>

      {recall.recalledIncidents.length ===
      0 ? (
        <p className="text-xs text-slate-500">
          No relevant previous incidents found.
          This investigation is based on the
          current incident data.
        </p>
      ) : (
        <ul className="space-y-3">
          {recall.recalledIncidents.map(
            (r) => (
              <li
                key={r.incidentId}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    {r.incidentId}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      r.relevance ===
                      'Matched'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {r.relevance}
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-900">
                  {r.title}
                </p>

                <p className="text-xs text-slate-500">
                  {r.service} ·{' '}
                  <SeverityInline
                    severity={r.severity}
                  />
                </p>

                {r.rootCauseSummary && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {r.rootCauseSummary}
                  </p>
                )}

                {r.resolutionTime && (
                  <p className="mt-1 text-xs text-slate-400">
                    Resolved in{' '}
                    {r.resolutionTime}
                  </p>
                )}

                <Link
                  href={`/incidents/${r.incidentId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
                >
                  View Details
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function SeverityInline({
  severity,
}: {
  severity: string;
}) {
  return <span>{severity}</span>;
}

function RelatedIncidentsTab({
  recall,
}: {
  recall: RecallOutcome | null;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Link2 className="h-4 w-4" />

        Incidents recalled from Hindsight
        memory
      </div>

      {!recall ||
      recall.recalledIncidents.length ===
        0 ? (
        <p className="text-sm text-slate-500">
          {recall?.usedHindsight === false
            ? recall.error
            : 'No relevant previous incidents found. Run an investigation to search memory.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recall.recalledIncidents.map(
            (r) => (
              <Link
                key={r.incidentId}
                href={`/incidents/${r.incidentId}`}
                className="card block hover:shadow-md"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {r.incidentId}
                  </span>

                  <span className="text-xs text-slate-400">
                    {r.relevance}
                  </span>
                </div>

                <p className="mb-1 text-sm text-slate-700">
                  {r.title}
                </p>

                <p className="text-xs text-slate-500">
                  {r.service}
                </p>
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}