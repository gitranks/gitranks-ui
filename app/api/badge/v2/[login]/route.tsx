import { notFound } from 'next/navigation';
import { NextRequest } from 'next/server';

import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { renderInlineBadge } from '@/badge/templates/inline/inline.render';
import { posthog } from '@/lib/posthog/posthog-node-client';

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

  const userAgent = req.headers.get('user-agent');
  const referer = req.headers.get('referer');

  posthog.capture({
    distinctId: login,
    event: 'badge_v2_rendered',
    properties: { userAgent, referer },
  });

  const svg = await renderInlineBadge({ login, params: validationResult.data });

  if (!svg) {
    return notFound();
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'max-age=300, public',
    },
  });
}
