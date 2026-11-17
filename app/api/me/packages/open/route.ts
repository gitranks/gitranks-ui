import { type NextRequest, NextResponse } from 'next/server';

import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * Whether package pages are open to this viewer, signed in or not, for the parts of a page drawn in the browser:
 * `{ open }`. One URL answers signed-in and signed-out viewers alike, so no cache keeps the answer; the browser asks
 * once per page load.
 */
export async function GET(req: NextRequest) {
  const open = await requestMaySeePackages(req);
  return NextResponse.json({ open }, { headers: { 'Cache-Control': 'private, no-store' } });
}
