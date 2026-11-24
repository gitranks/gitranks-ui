import 'server-only';

import { SkillsShareCard } from './skills-share-card';
import { LESSON_CARD_HEADERS } from '@/components/learn/share/lesson-card-response';
import type { SkillsCardRead } from '@/lib/skills/skills-card.data';
import { type SkillsCard, skillsCardOf, skillsCardUrlOf, skillsCardVersionOf } from '@/lib/skills/skills-share-card';
import { drawSocialCard } from '@/lib/social-card/social-card';
import { isGithubLogin } from '@/utils/profile-refresh';

/** Every answer that is not the picture itself is kept nowhere, so a page shown again has its picture at once. */
const NOT_KEPT = { 'Cache-Control': 'private, no-store' } as const;

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(`${body}\n`, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_KEPT, ...headers },
  });

const notFound = () => text('Not found', 404);
const unavailable = () =>
  text('This picture cannot be drawn right now. Try again in a minute.', 503, { 'Retry-After': '60' });

/** A Skills picture drawn as a PNG. */
export const drawSkillsCard = (card: SkillsCard) => drawSocialCard(<SkillsShareCard card={card} />);

type Found = { card: SkillsCard } | { response: Response };

/**
 * The picture of a login's public page, or why there is none: not found for anything that is not a login, a page that
 * is not public (nothing to show, hidden, no such person) and a page with nothing left to draw; 503 when it cannot be
 * read.
 */
async function cardOf(login: string, read: (login: string) => Promise<SkillsCardRead>): Promise<Found> {
  if (!isGithubLogin(login)) return { response: notFound() };
  let found: SkillsCardRead;
  try {
    found = await read(login);
  } catch {
    return { response: unavailable() };
  }
  if (found.failed) return { response: unavailable() };
  const card = found.brief ? skillsCardOf(found.brief, found.learnOpen) : null;
  return card ? { card } : { response: notFound() };
}

/**
 * `/profile/<login>/skills/card.png`: drawn under exactly the login as GitRanks stores it and `?v=<version>`; any other
 * spelling or query is a 308 to its current address, so no query makes it draw again. Kept as a lesson's picture is.
 */
export async function skillsCardResponse(
  login: string,
  search: string,
  read: (login: string) => Promise<SkillsCardRead>,
  draw: (card: SkillsCard) => Promise<Uint8Array<ArrayBuffer>> = drawSkillsCard,
): Promise<Response> {
  const found = await cardOf(login, read);
  if ('response' in found) return found.response;
  const { card } = found;
  if (login !== card.login || search !== `?v=${skillsCardVersionOf(card)}`) {
    return new Response(null, { status: 308, headers: { Location: skillsCardUrlOf(card), ...NOT_KEPT } });
  }
  try {
    return new Response(await draw(card), { headers: LESSON_CARD_HEADERS });
  } catch (error) {
    console.error('Error drawing a Skills card:', error);
    return unavailable();
  }
}

/**
 * The old Learn picture of a login, which a README may show: a 307 to the Skills picture's current address, kept five
 * minutes (the address changes with the numbers); not found where there is no public page.
 */
export async function oldLearnCardResponse(
  login: string,
  read: (login: string) => Promise<SkillsCardRead>,
): Promise<Response> {
  const found = await cardOf(login, read);
  if ('response' in found) return found.response;
  return new Response(null, {
    status: 307,
    headers: { Location: skillsCardUrlOf(found.card), 'Cache-Control': 'public, max-age=300' },
  });
}
