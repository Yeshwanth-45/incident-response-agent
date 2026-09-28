import { NextRequest, NextResponse } from 'next/server';

import { createPostmortem, getIncident } from '@/lib/db';
import { retainIncidentMemory } from '@/lib/hindsight';

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

  const errors: Record<string, string> = {};

  if (
    typeof body.rootCause !== 'string' ||
    !body.rootCause.trim()
  ) {
    errors.rootCause = 'Root cause is required.';
  }

  if (
    typeof body.resolutionSteps !== 'string' ||
    !body.resolutionSteps.trim()
  ) {
    errors.resolutionSteps =
      'Resolution steps are required.';
  }

  if (
    typeof body.lessonsLearned !== 'string' ||
    !body.lessonsLearned.trim()
  ) {
    errors.lessonsLearned =
      'Lessons learned are required.';
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { errors },
      { status: 400 }
    );
  }

  createPostmortem({
    incidentId: id,
    rootCause: body.rootCause.trim(),
    resolutionSteps: body.resolutionSteps.trim(),
    runbookUsed:
      typeof body.runbookUsed === 'string'
        ? body.runbookUsed.trim() || null
        : null,
    lessonsLearned: body.lessonsLearned.trim(),
    additionalNotes:
      typeof body.additionalNotes === 'string'
        ? body.additionalNotes.trim() || null
        : null,
  });

  const updatedIncident = getIncident(id);

  if (!updatedIncident) {
    return NextResponse.json(
      {
        error:
          'Postmortem was saved, but the updated incident could not be loaded.',
      },
      { status: 500 }
    );
  }

  const retainResult =
    await retainIncidentMemory(updatedIncident);

  if (!retainResult.success) {
    return NextResponse.json(
      {
        success: false,
        postmortemSaved: true,
        memoryRetained: false,
        memoryError:
          retainResult.error ||
          'Hindsight memory retention failed.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    postmortemSaved: true,
    memoryRetained: true,
  });
}