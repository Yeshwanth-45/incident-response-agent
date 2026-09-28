import { NextResponse } from 'next/server';
import { hindsightHealthCheck } from '@/lib/hindsight';
import { grokHealthCheck } from '@/lib/grok';

export async function GET() {
  const [hindsight, grok] = await Promise.all([hindsightHealthCheck(), grokHealthCheck()]);
  return NextResponse.json({
    status: 'ok',
    hindsight,
    grok,
    environment: process.env.NODE_ENV || 'development',
  });
}
