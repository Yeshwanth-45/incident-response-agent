import { SeverityBadge } from '@/components/Badges';
import type { Runbook } from '@/lib/types';

export function RunbookDetail({ runbook }: { runbook: Runbook }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{runbook.id}</h2>
          <SeverityBadge severity={runbook.severity} />
        </div>
        <p className="mb-1 text-sm font-medium text-slate-800">{runbook.name}</p>
        <p className="text-sm text-slate-600">{runbook.description}</p>
        <p className="mt-2 text-xs text-slate-400">Service: {runbook.service}</p>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Steps</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {runbook.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Verification Steps</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          {runbook.verificationSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      {runbook.notes && (
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
          <p className="text-sm text-slate-700">{runbook.notes}</p>
        </div>
      )}
    </div>
  );
}
