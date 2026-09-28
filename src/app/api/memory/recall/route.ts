import { NextRequest, NextResponse } from 'next/server';

import { recallSimilarIncidents } from '@/lib/hindsight';

// Standalone recall endpoint - lets an incident-shaped payload
// be tested against Hindsight without going through the
// full investigation pipeline.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (
    !body ||
    typeof body.id !== 'string' ||
    typeof body.service !== 'string' ||
    typeof body.title !== 'string'
  ) {
    return NextResponse.json(
      {
        error:
          'id, service, and title are required.',
      },
      { status: 400 }
    );
  }

  const description =
    typeof body.description === 'string'
      ? body.description
      : '';

  const logs =
    typeof body.logs === 'string'
      ? body.logs
      : null;

  try {
    const recall = await recallSimilarIncidents({
      id: body.id,
      service: body.service,
      title: body.title,
      description,
      logs,
    });

    return NextResponse.json({ recall });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Hindsight recall failed.';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}