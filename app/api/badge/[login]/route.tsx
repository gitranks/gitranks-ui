import { notFound } from 'next/navigation';
import { NextRequest } from 'next/server';

import { BadgeTemplateType } from '@/badge/badge.types';
import { BadgeZodSchema } from '@/badge/badge.zod';
import { renderMediumBadge } from '@/badge/templates/medium/medium.render';
import { renderSmallBadge } from '@/badge/templates/small/small.render';

type Props = { params: Promise<{ login: string }> };

const getRendererByTemplate = (template: BadgeTemplateType) => {
  switch (template) {
    case BadgeTemplateType.Small:
      return renderSmallBadge;
    default:
      return renderMediumBadge;
  }
};

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const searchParams = req.nextUrl.searchParams;
  const badgeParams = Object.fromEntries(searchParams.entries());
  const validationResult = BadgeZodSchema.safeParse(badgeParams);

  if (!validationResult.success) {
    return new Response('Invalid query params', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'max-age=300, public',
      },
    });
  }

  const { rankingType, template, theme } = validationResult.data;

  const svg = await getRendererByTemplate(template)({ theme, login, rankingType });

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
