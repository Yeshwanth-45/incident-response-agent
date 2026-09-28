import { NextResponse } from 'next/server';
import { listRunbooks } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ runbooks: listRunbooks() });
}
