import { NextRequest, NextResponse } from 'next/server';

import { getIncident } from '@/lib/db';
import { retainIncidentMemory } from '@/lib/hindsight';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (
    !body ||
    typeof body.incidentId !== 'string' ||
    !body.incidentId.trim()
  ) {
    return NextResponse.json(
      { error: 'incidentId is required.' },
      { status: 400 }
    );
  }

  const incidentId = body.incidentId.trim();

  const incident = getIncident(incidentId);

  if (!incident) {
    return NextResponse.json(
      { error: 'Incident not found.' },
      { status: 404 }
    );
  }

  try {
    const result =
      await retainIncidentMemory(incident);

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Hindsight retention failed.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}