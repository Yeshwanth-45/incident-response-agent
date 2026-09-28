import { notFound } from 'next/navigation';
import { getRunbook } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { RunbookDetail } from '@/components/RunbookDetail';

export const dynamic = 'force-dynamic';

export default function RunbookPage({ params }: { params: { id: string } }) {
  const runbook = getRunbook(params.id);
  if (!runbook) notFound();

  return (
    <div>
      <PageHeader title={runbook.name} subtitle={`Runbook ${runbook.id}`} />
      <div className="mx-auto max-w-3xl p-8">
        <RunbookDetail runbook={runbook} />
      </div>
    </div>
  );
}
