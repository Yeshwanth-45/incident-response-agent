import Link from 'next/link';
import { listRunbooks } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { SeverityBadge } from '@/components/Badges';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function RunbooksPage() {
  const runbooks = listRunbooks();

  return (
    <div>
      <PageHeader title="Runbooks" subtitle="Standard operating procedures for common incident types." />
      <div className="grid grid-cols-1 gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3">
        {runbooks.length === 0 ? (
          <p className="text-sm text-slate-500">No runbooks available.</p>
        ) : (
          runbooks.map((rb) => (
            <Link key={rb.id} href={`/runbooks/${rb.id}`} className="card block hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <BookOpen className="h-4 w-4 text-violet-600" />
                <SeverityBadge severity={rb.severity} />
              </div>
              <p className="text-sm font-semibold text-slate-900">{rb.id}</p>
              <p className="mb-1 text-sm font-medium text-slate-700">{rb.name}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{rb.description}</p>
              <p className="mt-2 text-xs text-slate-400">{rb.service}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
