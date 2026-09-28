import { NextRequest, NextResponse } from 'next/server';

import { getIncident } from '@/lib/db';
import { investigateIncident } from '@/lib/agent';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params;

  const incident = getIncident(id);

  if (!incident) {
    return NextResponse.json(
      { error: 'Incident not found.' },
      { status: 404 }
    );
  }

  try {
    const { analysis, recall } =
      await investigateIncident(id);

    return NextResponse.json({
      analysis,
      recall,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Investigation failed.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}