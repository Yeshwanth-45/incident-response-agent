import { clsx } from 'clsx';
import type { IncidentStatus, Severity } from '@/lib/types';

const SEVERITY_STYLES: Record<Severity, string> = {
  Critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  High: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  Low: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
};

const SEVERITY_DOT: Record<Severity, string> = {
  Critical: 'bg-red-600',
  High: 'bg-orange-500',
  Medium: 'bg-amber-500',
  Low: 'bg-green-600',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        SEVERITY_STYLES[severity]
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[severity])} aria-hidden />
      {severity}
    </span>
  );
}

const STATUS_STYLES: Record<IncidentStatus, string> = {
  Active: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  Investigating: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  Resolved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', STATUS_STYLES[status])}>
      {status}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day > 1 ? 's' : ''} ago`;
}
