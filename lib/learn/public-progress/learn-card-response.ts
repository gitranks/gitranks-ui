import type { LearnRecord } from '../learn.types';
import { githubLoginOf } from '../learn-path';
import { isStoredSpelling, learnCardUrlOf, learnCardVersionOf } from './public-progress';

/**
 * How the progress card is kept. Drawn: five minutes in a browser, an hour in a shared cache and nothing stale after
 * it, since the card names a person's numbers. Every other answer is short or not kept at all.
 */
export const LEARN_CARD_HEADERS = {
  card: { 'Cache-Control': 'public, max-age=300', 'Cloudflare-CDN-Cache-Control': 'max-age=3600' },
  /** No public record: a card may appear soon. */
  missing: { 'Cache-Control': 'public, max-age=60' },
  /** Not the stored spelling, or another `v`: never kept anywhere, so the next request is right. */
  never: { 'Cache-Control': 'no-store' },
  /** The record or the drawing failed: asked again soon, never a card with zeros. */
  unavailable: { 'Cache-Control': 'public, max-age=60, s-maxage=60', 'Retry-After': '60' },
} as const satisfies Record<string, Record<string, string>>;

const text = (body: string, status: number, headers: Record<string, string>) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });

/**
 * The card's answer for a login and the `v` asked. The card exists for the stored spelling of a login with a public
 * record alone, and is drawn for its current numbers alone: any other `v` (missing, made up, or a minute behind) is a
 * 308 to the current address, so one login has one drawable address at a time.
 */
export async function learnCardResponse(
  loginAsked: string,
  version: string | null,
  read: (login: string) => Promise<LearnRecord | null>,
  draw: (login: string, record: LearnRecord) => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Response> {
  const login = githubLoginOf(loginAsked);
  if (!login) return text('Not found', 404, LEARN_CARD_HEADERS.missing);
  let record: LearnRecord | null;
  try {
    record = await read(login);
  } catch {
    return new Response(null, { status: 503, headers: LEARN_CARD_HEADERS.unavailable });
  }
  if (!record) return text('Not found', 404, LEARN_CARD_HEADERS.missing);
  if (!isStoredSpelling(record, login)) return text('Not found', 404, LEARN_CARD_HEADERS.never);
  if (version !== learnCardVersionOf(record)) {
    return new Response(null, {
      status: 308,
      headers: { Location: learnCardUrlOf(login, record), ...LEARN_CARD_HEADERS.never },
    });
  }
  try {
    return new Response(await draw(login, record), {
      headers: { 'Content-Type': 'image/png', ...LEARN_CARD_HEADERS.card },
    });
  } catch (error) {
    console.error('Error drawing a Learn card:', error);
    return new Response(null, { status: 503, headers: LEARN_CARD_HEADERS.unavailable });
  }
}
