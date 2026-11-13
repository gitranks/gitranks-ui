import 'server-only';

import { cookies } from 'next/headers';

import type { LessonReaction } from './learn.types';
import { githubLoginOf, lessonSlugOf } from './learn-path';

/**
 * A reaction picked while signed out travels through the GitHub sign-in in the result page's address (`?react=yes`),
 * so it is stored on return with no second click. An address alone could be sent to anyone signed in, so the pick also
 * leaves this mark when the sign-in starts: the return stores the reaction only when the mark names the same result
 * page and the same pick, and uses it up.
 */
const MARK_COOKIE = 'gitranks-learn-react';

/** Long enough to go through GitHub's consent screen. */
const MARK_WINDOW_SEC = 10 * 60;

/** The mark's cookie: `__Host-` in production (Secure, the whole site, no domain), plain in local development. */
export function reactMarkCookie(secure = process.env.NODE_ENV === 'production') {
  return {
    name: secure ? `__Host-${MARK_COOKIE}` : MARK_COOKIE,
    options: { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' },
  };
}

const markOf = (slug: string, login: string, reaction: LessonReaction) => `${slug}/${login.toLowerCase()}/${reaction}`;

/** Leaves the mark of a pick about to go through the sign-in; false (and no mark) for a malformed one. */
export async function markReaction(slug: unknown, login: unknown, reaction: LessonReaction): Promise<boolean> {
  const id = lessonSlugOf(slug);
  const githubLogin = githubLoginOf(login);
  if (!id || !githubLogin) return false;
  const { name, options } = reactMarkCookie();
  (await cookies()).set(name, markOf(id, githubLogin, reaction), { ...options, maxAge: MARK_WINDOW_SEC });
  return true;
}

/** Whether the mark names this result page and this pick. Any mark is used up. */
export async function takeReactionMark(slug: string, login: string, reaction: LessonReaction): Promise<boolean> {
  const jar = await cookies();
  const { name, options } = reactMarkCookie();
  const mark = jar.get(name)?.value;
  if (mark === undefined) return false;
  jar.set(name, '', { ...options, maxAge: 0 });
  return mark === markOf(slug, login, reaction);
}
