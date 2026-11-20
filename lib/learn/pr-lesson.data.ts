import 'server-only';

import { isAuthorResult, isOwnResult } from './lesson-public';
import { loadLessonResult, loadMyResultReaction } from './lesson-public.data';
import { type PrLessonRead, prLessonTargetOf } from './pr-lesson';
import { hasReactionMark } from './react-mark';
import { loadPrStrip, PAGE_READ_TIMEOUT_MS, TIMED_OUT, within } from '@/lib/contribute/pr-feedback.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { reactionParamOf } from '@/lib/workspace/paths';

/**
 * The Learn maintainers page's footer link (`?from=`, Learn spec §9.3): the pull request's public card, then its
 * author's public result on the lesson and the visitor's reaction, as the result page reads them. Null, so the page
 * stays as it is, for an id we did not give, a Contribute pull request, any failure or a read slower than the page
 * waits. Nothing private is read: the card names a lesson only while its page is open to everyone.
 */
export async function loadPrLesson(from: unknown, react: unknown): Promise<PrLessonRead | null> {
  const card = await loadPrStrip(from);
  const target = prLessonTargetOf(card);
  if (!card || !target) return null;
  if (target.kind === 'closed') return { kind: 'closed', card };

  const answer = await within(
    loadLessonResult(target.slug, target.login).catch(() => null),
    PAGE_READ_TIMEOUT_MS,
  );
  if (answer === TIMED_OUT || !answer) return null;
  if (answer.kind === 'stub') return { kind: 'closed', card };
  const result = answer.value;
  // Only the author's result takes reactions, and only the author's is the pull request's.
  if (!isAuthorResult(result)) return null;

  // A pick back from the sign-in this browser started; `?react=` on a link alone picks nothing.
  const pick = reactionParamOf(react);
  const returned = pick && (await hasReactionMark(result.head.slug, result.login, pick)) ? pick : null;
  const own = isOwnResult(await viewerLogin(), result.login);
  const { canReact, reaction } = own
    ? { canReact: false, reaction: null }
    : await loadMyResultReaction(result.head.slug, result.login);
  return { kind: 'lesson', card, result, viewer: { canReact, mine: reaction, returned, own } };
}
