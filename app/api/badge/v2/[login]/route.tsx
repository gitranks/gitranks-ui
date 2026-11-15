import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { badgeSeenReporterFor } from '@/badge/badge-seen-reporter';
import { renderInlineBadgeResult } from '@/badge/templates/inline/inline.render';

type Props = { params: Promise<{ login: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const searchParams = req.nextUrl.searchParams;
  const badgeParams = Object.fromEntries(searchParams.entries());
  const validationResult = BadgeV2ZodSchema.safeParse(badgeParams);

  if (!validationResult.success) {
    return new Response('Invalid query params', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'max-age=300, public',
      },
    });
  }

  // const userAgent = req.headers.get('user-agent');
  // const referer = req.headers.get('referer');

  // capture({
  //   distinctId: login,
  //   event: 'badge_v2_rendered',
  //   properties: { userAgent, referer },
  // });

  const { svg, error } = await renderInlineBadgeResult({ login, params: validationResult.data });

  if (!svg) {
    return notFound();
  }

  // An unknown login is drawn as an error image: only a badge with data is reported.
  if (!error) {
    badgeSeenReporterFor(req)?.('user', login);
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'max-age=300, public',
    },
  });
}
