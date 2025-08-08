import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { BadgeV2ZodSchema } from '@/badge/badge.zod';
import { renderInlineBadge } from '@/badge/templates/inline/inline.render';

type Props = { params: Promise<{ login: string }> };

// ranking = stars / contributions / followers
// context = global / country
// type = position / tier / percentile
// position-type = none / monthly-change / percentile
// tier-type = none / goal
// label = text
// left-color = hex
// right-color = hex

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

  console.log({ userAgent, referer });

  // posthog.capture({
  //   distinctId: login,
  //   event: 'badge_rendered',
  //   properties: { rankingType, template, theme },
  // });

  const svg = await renderInlineBadge({ login, params: validationResult.data });

  if (!svg) {
    return redirect('/404');
  }

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'max-age=300, public',
    },
  });
}
