'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { Search } from 'lucide-react';
import type { Incident } from '@/lib/types';

const SERVICES = [
  'All Services',
  'Payment API',
  'Database',
  'Auth Service',
  'Cache',
  'Kafka',
  'Email Service',
  'Web Server',
  'API Gateway',
];

const STATUSES = ['All Status', 'Active', 'Investigating', 'Resolved'];
const PAGE_SIZE = 6;

export default function HistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [search, setSearch] = useState('');
  const [service, setService] = useState('All Services');
  const [status, setStatus] = useState('All Status');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set('search', search.trim());
    }

    if (service !== 'All Services') {
      params.set('service', service);
    }

    if (status !== 'All Status') {
      params.set('status', status);
    }

    async function loadIncidents() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/incidents?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load incidents.');
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('incidents' in data) ||
          !Array.isArray(data.incidents)
        ) {
          throw new Error('Invalid incident data received.');
        }

        setIncidents(data.incidents as Incident[]);
        setPage(1);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setIncidents([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load incidents.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadIncidents();

    return () => controller.abort();
  }, [search, service, status]);

  const totalPages = Math.max(
    1,
    Math.ceil(incidents.length / PAGE_SIZE)
  );

  const paged = useMemo(
    () =>
      incidents.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
      ),
    [incidents, page]
  );

  return (
    <div>
      <PageHeader
        title="Incident History"
        subtitle="View and search all past incidents."
      />

      <div className="p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              className="input-field pl-9"
              placeholder="Search incidents…"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="input-field sm:w-48"
            value={service}
            onChange={(event) =>
              setService(event.target.value)
            }
          >
            {SERVICES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            className="input-field sm:w-40"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="card overflow-hidden !p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Loading incidents…
            </p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Unable to load incident history.
            </p>
          ) : incidents.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No incidents match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paged.map((incident) => (
                    <tr
                      key={incident.id}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="font-medium text-brand-600 hover:underline"
                        >
                          {incident.id}
                        </Link>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/incidents/${incident.id}`}
                          className="block"
                        >
                          {incident.title}
                        </Link>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {incident.service}
                      </td>

                      <td className="px-4 py-3">
                        <SeverityBadge
                          severity={incident.severity}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {new Date(
                          incident.createdAt
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading &&
          !error &&
          incidents.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <button
                className="btn-secondary !px-3 !py-1.5"
                disabled={page <= 1}
                onClick={() =>
                  setPage((current) => current - 1)
                }
              >
                Prev
              </button>

              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>

              <button
                className="btn-secondary !px-3 !py-1.5"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                Next
              </button>
            </div>
          )}
      </div>
    </div>
  );
}