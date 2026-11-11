import { type NextRequest, NextResponse } from 'next/server';

import { signedFetch } from '@/lib/signed-fetch';

/** The sign-in session's cookie, as the proxy tests for it: read here without the session itself, which sets cookies. */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

/** A report is a few short fields; anything larger is not one. */
const MAX_BODY = 2_000;
const FIELDS = ['kind', 'source', 'path', 'target', 'utmSource', 'utmMedium', 'utmCampaign', 'referrerHost'] as const;

const done = () => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });

/**
 * A step into Contribute, reported by the page (`ContributeClickTracker`): passed on with whether the visitor has a
 * sign-in session, never who they are. The address and browser go along only to tell one day's visitors apart; neither
 * is stored. Sets no cookie. Always 204: the page has moved on and nothing here is its concern.
 */
export async function POST(req: NextRequest) {
  let report: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return done();
    report = JSON.parse(text);
  } catch {
    return done();
  }
  if (!report || typeof report !== 'object') return done();

  const body: Record<string, unknown> = {
    signedIn: req.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name)),
    ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
    userAgent: req.headers.get('user-agent')?.slice(0, 512) || undefined,
  };
  for (const field of FIELDS) {
    if (typeof report[field] === 'string') body[field] = report[field];
  }

  try {
    await signedFetch(
      '/contribute-clicks/log',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      },
      'client',
    );
  } catch {
    // A count lost is not worth an error on the page.
  }
  return done();
}
