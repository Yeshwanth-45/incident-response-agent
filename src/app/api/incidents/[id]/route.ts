import { NextRequest, NextResponse } from 'next/server';

import {
  getIncident,
  getPostmortem,
  listTimeline,
  listChatMessages,
  updateIncidentStatus,
} from '@/lib/db';

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

  const incident = getIncident(id);

  if (!incident) {
    return NextResponse.json(
      { error: 'Incident not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    incident,
    timeline: listTimeline(id),
    chatMessages: listChatMessages(id),
    postmortem: getPostmortem(id),
  });
}

export async function PATCH(
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

  const validStatuses = [
    'Active',
    'Investigating',
    'Resolved',
  ];

  if (
    !body.status ||
    !validStatuses.includes(body.status)
  ) {
    return NextResponse.json(
      { error: 'A valid status is required.' },
      { status: 400 }
    );
  }

  updateIncidentStatus(id, body.status);

  return NextResponse.json({
    incident: getIncident(id),
  });
}