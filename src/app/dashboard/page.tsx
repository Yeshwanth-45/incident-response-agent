import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ListChecks, BookOpen, PlusCircle, History as HistoryIcon } from 'lucide-react';
import { dashboardStats, listIncidents } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { SeverityBadge, timeAgo } from '@/components/Badges';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const stats = dashboardStats();
  const active = listIncidents({ status: 'Active' }).slice(0, 5);
  const recent = listIncidents().slice(0, 5);

  return (
    <div>
      <PageHeader title="Good morning!" subtitle="Here's the current status of your systems." />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={AlertTriangle} iconClass="text-red-600 bg-red-50" value={stats.active} label="Active Incidents" />
          <StatCard icon={CheckCircle2} iconClass="text-green-600 bg-green-50" value={stats.resolvedThisMonth} label="Resolved (This Month)" />
          <StatCard icon={ListChecks} iconClass="text-blue-600 bg-blue-50" value={stats.total} label="Total Incidents" />
          <StatCard icon={BookOpen} iconClass="text-violet-600 bg-violet-50" value={stats.runbooks} label="Runbooks" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Active Incidents</h2>
              <Link href="/history" className="text-sm font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>
            {active.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No active incidents. Your systems look quiet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {active.map((inc) => (
                  <li key={inc.id}>
                    <Link
                      href={`/incidents/${inc.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{inc.id}</span>
                          <span className="truncate text-sm text-slate-600">{inc.title}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <SeverityBadge severity={inc.severity} />
                        <span className="text-xs text-slate-400">{timeAgo(inc.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">System Health</h2>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Simulated</span>
            </div>
            <div className="mb-1 text-2xl font-semibold text-slate-900">
              {Math.max(0, 100 - stats.active * 6)}%
            </div>
            <p className="mb-3 text-xs text-slate-500">Healthy - simulated for demo purposes, not connected to live monitoring.</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Healthy</span><span>{Math.max(0, 100 - stats.active * 10)}%</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Degraded</span><span>{Math.min(20, stats.active * 4)}%</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Down</span><span>{Math.min(10, stats.active * 2)}%</span></div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 font-semibold text-slate-900">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <Link href="/incidents/new" className="btn-primary w-full">
                <PlusCircle className="h-4 w-4" /> Report New Incident
              </Link>
              <Link href="/runbooks" className="btn-secondary w-full">
                <BookOpen className="h-4 w-4" /> View Runbooks
              </Link>
              <Link href="/history" className="btn-secondary w-full">
                <HistoryIcon className="h-4 w-4" /> Incident History
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <Link href="/history" className="text-sm font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between py-3">
                <div className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{inc.id}</span>{' '}
                  {inc.status === 'Resolved' ? 'Resolved' : 'New incident'}: {inc.title}
                </div>
                <span className="text-xs text-slate-400">{timeAgo(inc.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  value,
  label,
}: {
  icon: React.ElementType;
  iconClass: string;
  value: number;
  label: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
