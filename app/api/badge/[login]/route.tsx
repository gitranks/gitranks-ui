import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { BadgeTemplateType } from '@/badge/badge.types';
import { renderMediumBadge } from '@/badge/templates/medium/medium.render';
import { renderSmallBadge } from '@/badge/templates/small/small.render';
import { posthog } from '@/lib/posthog/posthog-node-client';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

type Props = { params: Promise<{ login: string }> };

const getRendererByTemplate = (template: BadgeTemplateType) => {
  switch (template) {
    case 'small':
      return renderSmallBadge;
    default:
      return renderMediumBadge;
  }
};

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const searchParams = req.nextUrl.searchParams;
  const rankingType = (searchParams.get('rankingType') ?? 'star') as RankingType;
  const template = (searchParams.get('template') ?? 'medium') as BadgeTemplateType;
  const theme = (searchParams.get('theme') ?? 'light') as ThemeType;

  posthog.capture({
    distinctId: login,
    event: 'badge_rendered',
    properties: { rankingType, template, theme },
  });

  const svg = await getRendererByTemplate(template)({ theme, login, rankingType });

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
