'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Save,
  CheckCircle2,
  AlertTriangle,
  Brain,
  ArrowRight,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';

import type { Runbook } from '@/lib/types';

interface SubmitResult {
  postmortemSaved: boolean;
  memoryRetained: boolean;
  memoryError?: string;
}

export default function PostmortemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] =
    useState('');
  const [runbookUsed, setRunbookUsed] =
    useState('');
  const [lessonsLearned, setLessonsLearned] =
    useState('');
  const [additionalNotes, setAdditionalNotes] =
    useState('');

  const [runbooks, setRunbooks] =
    useState<Runbook[]>([]);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [saving, setSaving] =
    useState(false);

  const [result, setResult] =
    useState<SubmitResult | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRunbooks() {
      try {
        const response =
          await fetch('/api/runbooks');

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setRunbooks(data.runbooks || []);
        }
      } catch {
        if (!cancelled) {
          setRunbooks([]);
        }
      }
    }

    void loadRunbooks();

    return () => {
      cancelled = true;
    };
  }, []);

  function validate() {
    const next: Record<string, string> = {};

    if (!rootCause.trim()) {
      next.rootCause =
        'Root cause is required.';
    }

    if (!resolutionSteps.trim()) {
      next.resolutionSteps =
        'Resolution steps are required.';
    }

    if (!lessonsLearned.trim()) {
      next.lessonsLearned =
        'Lessons learned are required.';
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    setResult(null);
    setSubmitError(null);

    try {
      const res = await fetch(
        `/api/incidents/${id}/postmortem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rootCause: rootCause.trim(),
            resolutionSteps:
              resolutionSteps.trim(),
            runbookUsed:
              runbookUsed.trim() || null,
            lessonsLearned:
              lessonsLearned.trim(),
            additionalNotes:
              additionalNotes.trim() || null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors || {});

        setSubmitError(
          data.memoryError ||
            data.error ||
            'Could not save the post-incident review.'
        );

        if (
          data.postmortemSaved === true
        ) {
          setResult({
            postmortemSaved: true,
            memoryRetained: false,
            memoryError:
              data.memoryError ||
              'Hindsight retention failed.',
          });
        }

        return;
      }

      setResult({
        postmortemSaved:
          data.postmortemSaved === true,
        memoryRetained:
          data.memoryRetained === true,
        memoryError: data.memoryError,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving the review.';

      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  const memoryStored =
    result?.memoryRetained === true;

  return (
    <div>
      <PageHeader
        title="Post-Incident Review"
        subtitle="Capture key learnings so future incident investigations can benefit from past experience."
      />

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl p-8"
      >
        <div className="card space-y-5">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-start gap-3">
              <Brain className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Teach the incident-response agent
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Your root cause, resolution,
                  runbook, and lessons learned will
                  be stored in the application's
                  postmortem record and retained in
                  Hindsight for future incident recall.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">
              Incident ID
            </label>

            <input
              className="input-field bg-slate-50"
              value={id}
              disabled
            />
          </div>

          <div>
            <label className="label">
              Root Cause *
            </label>

            <textarea
              className="input-field min-h-[90px]"
              placeholder="What caused the incident?"
              value={rootCause}
              onChange={(e) =>
                setRootCause(e.target.value)
              }
              disabled={memoryStored}
            />

            {errors.rootCause && (
              <p className="mt-1 text-xs text-red-600">
                {errors.rootCause}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Resolution Steps *
            </label>

            <textarea
              className="input-field min-h-[110px]"
              placeholder={
                '1. Increased connection pool size...\n2. Restarted the payment service...\n3. Monitored recovery...'
              }
              value={resolutionSteps}
              onChange={(e) =>
                setResolutionSteps(
                  e.target.value
                )
              }
              disabled={memoryStored}
            />

            {errors.resolutionSteps && (
              <p className="mt-1 text-xs text-red-600">
                {errors.resolutionSteps}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Runbook Used
            </label>

            <select
              className="input-field"
              value={runbookUsed}
              onChange={(e) =>
                setRunbookUsed(e.target.value)
              }
              disabled={memoryStored}
            >
              <option value="">None</option>

              {runbooks.map((runbook) => (
                <option
                  key={runbook.id}
                  value={runbook.id}
                >
                  {runbook.id} — {runbook.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Lessons Learned *
            </label>

            <textarea
              className="input-field min-h-[90px]"
              placeholder="What should the team remember for the next similar incident?"
              value={lessonsLearned}
              onChange={(e) =>
                setLessonsLearned(
                  e.target.value
                )
              }
              disabled={memoryStored}
            />

            {errors.lessonsLearned && (
              <p className="mt-1 text-xs text-red-600">
                {errors.lessonsLearned}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Additional Notes
            </label>

            <textarea
              className="input-field min-h-[70px]"
              value={additionalNotes}
              onChange={(e) =>
                setAdditionalNotes(
                  e.target.value
                )
              }
              disabled={memoryStored}
            />
          </div>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{submitError}</span>
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl border p-4 ${
                memoryStored
                  ? 'border-green-200 bg-green-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {memoryStored ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}

                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      memoryStored
                        ? 'text-green-900'
                        : 'text-amber-900'
                    }`}
                  >
                    {memoryStored
                      ? 'Post-incident learning stored successfully'
                      : 'Postmortem saved, but Hindsight retention did not succeed'}
                  </p>

                  <p
                    className={`mt-1 text-xs leading-5 ${
                      memoryStored
                        ? 'text-green-800'
                        : 'text-amber-800'
                    }`}
                  >
                    {memoryStored
                      ? 'This incident can now become historical context for future investigations.'
                      : result.memoryError ||
                        'The postmortem is saved in the application, but it is not confirmed as Hindsight memory.'}
                  </p>
                </div>
              </div>

              {memoryStored && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-green-800">
                  <Brain className="h-4 w-4" />
                  Hindsight memory updated
                  <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  Future incident recall can use this learning.
                </div>
              )}
            </div>
          )}

          {memoryStored ? (
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/incidents/${id}`
                )
              }
              className="btn-secondary w-full"
            >
              View Incident
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full"
            >
              <Save className="h-4 w-4" />

              {saving
                ? 'Storing learning…'
                : 'Save and Store in Hindsight'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}