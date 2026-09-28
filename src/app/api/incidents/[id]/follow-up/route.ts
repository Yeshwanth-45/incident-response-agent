import { NextRequest, NextResponse } from 'next/server';

import { getIncident } from '@/lib/db';
import { askFollowUp } from '@/lib/agent';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  req: NextRequest,
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

  const body = await req.json().catch(() => ({}));

  const question =
    typeof body.question === 'string'
      ? body.question.trim()
      : '';

  if (!question) {
    return NextResponse.json(
      { error: 'A question is required.' },
      { status: 400 }
    );
  }

  try {
    const { analysis, recall } =
      await askFollowUp(id, question);

    return NextResponse.json({
      analysis,
      recall,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Follow-up failed.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}