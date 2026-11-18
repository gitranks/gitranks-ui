import { type NextRequest, NextResponse } from 'next/server';

import { followCallerOf } from '@/lib/follow/follow-route';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';
import { heroHitOf } from '@/lib/unsung-hero/unsung-hero';
import { sendHeroHit } from '@/lib/unsung-hero/unsung-hero-hit';
import { rejectWrongOrigin } from '@/utils/reject-wrong-origin';

/** A hit is two short fields; anything larger is not one. */
const BODY_MAX = 1_000;

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const refuse = (status: number, message: string) => NextResponse.json({ message }, { status, headers: NO_STORE });

async function bodyOf(req: NextRequest): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > BODY_MAX) return undefined;
  const text = await req.text().catch(() => '');
  if (!text || text.length > BODY_MAX) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * A view of this week's Unsung hero's repository page, or a press of its "Star on GitHub": `{ kind, repo }`. Passed on
 * with the signed-in viewer, if any, and the visitor's network address, read here on the server and never kept; the
 * count is once per visitor a day, and only for the hero's own repository. Only for a visitor who may see package
 * pages. 204 once passed on, whatever became of it.
 */
export async function POST(req: NextRequest) {
  if (rejectWrongOrigin(req)) return refuse(403, 'Forbidden');
  if (!(await requestMaySeePackages(req))) return refuse(404, 'Not found');

  const hit = heroHitOf(await bodyOf(req));
  if (!hit) return refuse(400, 'Expected { kind: "visit" | "github", repo: "owner/name" }');

  await sendHeroHit(await followCallerOf(req), hit);
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}
