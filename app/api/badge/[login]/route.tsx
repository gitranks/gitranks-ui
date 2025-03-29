import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { BadgeTemplateType, BadgeType, ThemeType } from '@/badge/badge.types';
import { renderSmallBadge } from '@/badge/templates/small/small.render';
import { renderMediumBadge } from '@/badge/templates/medium/medium.render';

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
  const type = searchParams.get('type') as BadgeType;
  const template = searchParams.get('template') as BadgeTemplateType;
  const theme = (searchParams.get('theme') ?? 'light') as ThemeType;

  const svg = await getRendererByTemplate(template)({ theme, login, type });

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
