import { NextRequest, NextResponse } from 'next/server';
import { createIncident, listIncidents } from '@/lib/db';
import type { Severity } from '@/lib/types';

const VALID_SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const incidents = listIncidents({
    service: searchParams.get('service') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  });
  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const errors: Record<string, string> = {};
  if (!body.service || typeof body.service !== 'string') errors.service = 'Service is required.';
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) errors.title = 'Title is required.';
  if (!body.description || typeof body.description !== 'string' || !body.description.trim())
    errors.description = 'Description is required.';
  if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) errors.severity = 'A valid severity is required.';

  if (body.logs && typeof body.logs === 'string' && body.logs.length > 50_000) {
    errors.logs = 'Log content is too large (50,000 character limit).';
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const incident = createIncident({
    title: body.title.trim(),
    service: body.service,
    severity: body.severity,
    description: body.description.trim(),
    logs: body.logs ? String(body.logs).slice(0, 50_000) : null,
  });

  return NextResponse.json({ incident }, { status: 201 });
}
