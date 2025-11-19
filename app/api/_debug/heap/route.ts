import { writeHeapSnapshot } from '@/utils/heap-snapshot';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token !== process.env.HEAP_SNAPSHOT_TOKEN) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const file = writeHeapSnapshot();
  return NextResponse.json({ file });
}
