import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { parseCanonicalBadgeFile } from '@/badge/canonical-badge';
import { renderCanonicalBadge } from '@/badge/render-canonical-badge';

type Props = { params: Promise<{ login: string; file: string }> };

function decodeLoginParam(rawLogin: string): string | null {
  try {
    const login = decodeURIComponent(rawLogin);
    return login || null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { login: rawLogin, file } = await params;
  const login = decodeLoginParam(rawLogin);
  const parsed = parseCanonicalBadgeFile(file);

  if (!parsed || !login) {
    notFound();
  }

  const result = await renderCanonicalBadge(login, parsed.variant, parsed.format);
  if (!result) {
    notFound();
  }

  return new Response(result.body instanceof Uint8Array ? Buffer.from(result.body) : result.body, {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
