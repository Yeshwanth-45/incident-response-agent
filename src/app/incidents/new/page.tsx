'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { UploadCloud, X, Sparkles } from 'lucide-react';

const SERVICES = [
  'Payment API',
  'Database',
  'Auth Service',
  'Cache',
  'Kafka',
  'Email Service',
  'Web Server',
  'API Gateway',
];

const SEVERITIES = [
  'Critical',
  'High',
  'Medium',
  'Low',
] as const;

type Severity = (typeof SEVERITIES)[number];

export default function NewIncidentPage() {
  const router = useRouter();

  const [service, setService] = useState('');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [logFileName, setLogFileName] =
    useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [errors, setErrors] =
    useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] =
    useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        logs: 'File is too large (2MB limit).',
      }));
      return;
    }

    if (!/\.(txt|log|json)$/i.test(file.name)) {
      setErrors((current) => ({
        ...current,
        logs:
          'Only .txt, .log, or .json log files are supported.',
      }));
      return;
    }

    try {
      const text = await file.text();

      setLogs(text);
      setLogFileName(file.name);
      setErrors((current) => ({
        ...current,
        logs: '',
      }));
    } catch {
      setErrors((current) => ({
        ...current,
        logs: 'Could not read the selected log file.',
      }));
    }
  }

  function validate() {
    const next: Record<string, string> = {};

    if (!service) {
      next.service = 'Service is required.';
    }

    if (!severity) {
      next.severity = 'Severity is required.';
    }

    if (!title.trim()) {
      next.title = 'Title is required.';
    }

    if (!description.trim()) {
      next.description =
        'Description is required.';
    }

    if (logs.length > 50_000) {
      next.logs =
        'Log content is too large (50,000 character limit).';
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

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: service.trim(),
          severity,
          title: title.trim(),
          description: description.trim(),
          logs: logs.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors || {});
        setSubmitError(
          data.error ||
            'Could not create the incident.'
        );
        return;
      }

      router.push(
        `/incidents/${data.incident.id}?autoInvestigate=1`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong.';

      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Report a New Incident"
        subtitle="Provide details about the issue you're facing."
      />

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl p-8"
      >
        <div className="card space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Service *
              </label>

              <select
                className="input-field"
                value={service}
                onChange={(e) =>
                  setService(e.target.value)
                }
                aria-invalid={!!errors.service}
              >
                <option value="">
                  Select a service
                </option>

                {SERVICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {errors.service && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.service}
                </p>
              )}
            </div>

            <div>
              <label className="label">
                Severity *
              </label>

              <select
                className="input-field"
                value={severity}
                onChange={(e) => {
                  const value = e.target.value;

                  if (
                    SEVERITIES.includes(
                      value as Severity
                    )
                  ) {
                    setSeverity(value as Severity);
                  } else {
                    setSeverity('');
                  }
                }}
                aria-invalid={!!errors.severity}
              >
                <option value="">
                  Select severity
                </option>

                {SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {errors.severity && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.severity}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              Title *
            </label>

            <input
              className="input-field"
              placeholder="e.g. Database connection timeout errors"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              aria-invalid={!!errors.title}
            />

            {errors.title && (
              <p className="mt-1 text-xs text-red-600">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Description *
            </label>

            <textarea
              className="input-field min-h-[120px]"
              placeholder="Describe what you're observing..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              aria-invalid={!!errors.description}
            />

            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Additional Logs (optional)
            </label>

            {logFileName ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <span className="truncate text-slate-700">
                  {logFileName} ·{' '}
                  {(logs.length / 1024).toFixed(1)} KB
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setLogFileName(null);
                    setLogs('');
                  }}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Remove attached log file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-brand-600 hover:text-brand-600">
                <UploadCloud className="h-5 w-5" />

                Upload a .txt, .log, or .json file
                (max 2MB), or paste logs below

                <input
                  type="file"
                  accept=".txt,.log,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />
              </label>
            )}

            <textarea
              className="input-field mt-2 min-h-[80px] font-mono text-xs"
              placeholder="Or paste log content here..."
              value={logFileName ? '' : logs}
              onChange={(e) =>
                setLogs(e.target.value)
              }
              disabled={!!logFileName}
            />

            {errors.logs && (
              <p className="mt-1 text-xs text-red-600">
                {errors.logs}
              </p>
            )}
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            <Sparkles className="h-4 w-4" />

            {submitting
              ? 'Creating incident…'
              : 'Start Investigation'}
          </button>
        </div>
      </form>
    </div>
  );
}