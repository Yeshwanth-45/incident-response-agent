import { PageHeader } from '@/components/PageHeader';
import { hindsightHealthCheck } from '@/lib/hindsight';
import { grokHealthCheck } from '@/lib/grok';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [hindsight, grok] = await Promise.all([hindsightHealthCheck(), grokHealthCheck()]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Connection status and application configuration." />
      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Connections</h2>
          <div className="space-y-4">
            <StatusRow
              label="Groq"
              detail={grok.configured ? `Model: ${grok.model}` : 'Not configured'}
              state={!grok.configured ? 'unconfigured' : grok.reachable ? 'ok' : 'error'}
              error={grok.error}
            />
            <StatusRow
              label="Hindsight"
              detail={hindsight.configured ? 'Persistent memory layer' : 'Not configured'}
              state={!hindsight.configured ? 'unconfigured' : hindsight.reachable ? 'ok' : 'error'}
              error={hindsight.error}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Application</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Environment</dt>
              <dd className="font-medium text-slate-800">{process.env.NODE_ENV || 'development'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Storage</dt>
              <dd className="font-medium text-slate-800">SQLite (local)</dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-slate-400">
          API keys are never displayed here. Configure credentials in your local <code>.env.local</code> file — see
          the README for details.
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  detail,
  state,
  error,
}: {
  label: string;
  detail: string;
  state: 'ok' | 'error' | 'unconfigured';
  error?: string;
}) {
  const Icon = state === 'ok' ? CheckCircle2 : state === 'error' ? XCircle : AlertCircle;
  const color = state === 'ok' ? 'text-green-600' : state === 'error' ? 'text-red-600' : 'text-slate-400';
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
    </div>
  );
}
