import 'server-only';

import { FixShareCard } from './fix-cards';
import type { FixCardRead } from '@/lib/learn/fix-share.data';
import { fixCardUrlOf, hasFixCard, type LearnFixCard } from '@/lib/learn/fix-share-card';
import { drawSocialCard } from '@/lib/social-card/social-card';
import type { PrRef } from '@/lib/workspace/pr-feedback';

/**
 * How a drawn picture is kept: as the fix's page and its Markdown copy are (a minute in a browser, two in a shared
 * cache), so a page its contributor hides takes its picture with it.
 */
export const FIX_CARD_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=60, s-maxage=120',
} as const;

/** Every answer that is not the picture itself is kept nowhere, so a page shown again has its picture at once. */
const NOT_KEPT = { 'Cache-Control': 'private, no-store' } as const;

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(`${body}\n`, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_KEPT, ...headers },
  });

const unavailable = () =>
  text('This picture cannot be drawn right now. Try again in a minute.', 503, { 'Retry-After': '60' });

/** A fix's picture drawn as a PNG. */
export const drawFixCard = (fix: LearnFixCard, learnOpen: boolean) =>
  drawSocialCard(<FixShareCard fix={fix} learnOpen={learnOpen} />);

/**
 * `/contribute/pr/<owner>/<repo>/<number>/card.png`: a merged or open fix's picture, drawn under exactly the address
 * the API names the pull request by and `?v=<version>`; any other spelling or query is a 308 to its current address,
 * so no query makes it draw again. Not found for a pull request with no public page, and for a closed one; 503 when
 * it cannot be read.
 */
export async function fixCardResponse(
  pr: PrRef | null,
  path: string,
  search: string,
  read: (pr: PrRef) => Promise<FixCardRead & { learnOpen: boolean }>,
  draw: (fix: LearnFixCard, learnOpen: boolean) => Promise<Uint8Array<ArrayBuffer>> = drawFixCard,
): Promise<Response> {
  if (!pr) return text('Not found', 404);
  let found: FixCardRead & { learnOpen: boolean };
  try {
    found = await read(pr);
  } catch {
    return unavailable();
  }
  if (found.failed) return unavailable();
  const { fix, learnOpen } = found;
  if (!fix || !hasFixCard(fix)) return text('Not found', 404);
  const url = fixCardUrlOf(fix, learnOpen);
  if (`${path}${search}` !== url) {
    return new Response(null, { status: 308, headers: { Location: url, ...NOT_KEPT } });
  }
  try {
    return new Response(await draw(fix, learnOpen), { headers: FIX_CARD_HEADERS });
  } catch (error) {
    console.error('Error drawing a fix card:', error);
    return unavailable();
  }
}
