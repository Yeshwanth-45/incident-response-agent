import { NextRequest, NextResponse } from 'next/server';

import { getRunbook } from '@/lib/db';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;

  const runbook = getRunbook(id);

  if (!runbook) {
    return NextResponse.json(
      { error: 'Runbook not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ runbook });
}