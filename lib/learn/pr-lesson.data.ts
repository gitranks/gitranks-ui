import 'server-only';

import { isAuthorResult, isOwnResult } from './lesson-public';
import { loadLessonResult, loadMyResultReaction } from './lesson-public.data';
import { type PrLessonRead, prLessonTargetOf } from './pr-lesson';
import { hasReactionMark } from './react-mark';
import { loadPrStrip, PAGE_READ_TIMEOUT_MS, TIMED_OUT, within } from '@/lib/contribute/pr-feedback.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { ContributePrCard } from '@/lib/workspace/contribute.types';
import { reactionParamOf } from '@/lib/workspace/paths';

/**
 * The footer link's pull request (`?from=`) as the Learn maintainers page shows it on top: its public card, for a Learn
 * pull request alone. Null for an id we did not give, a Contribute pull request, any failure or a slow read.
 */
export async function loadLearnPrCard(from: unknown): Promise<ContributePrCard | null> {
  const card = await loadPrStrip(from);
  return prLessonTargetOf(card) ? card : null;
}

/**
 * The Learn maintainers page's lesson block (Learn spec §9.3), for the card `loadLearnPrCard` read: the author's public
 * result on the lesson and the visitor's reaction, as the result page reads them, or the neutral line while the lesson
 * is not public. Null, so the block stays out, for no card, a failure or a read slower than the page waits. Nothing
 * private is read: the card names a lesson only while its page is open to everyone.
 */
export async function loadPrLesson(card: ContributePrCard | null, react: unknown): Promise<PrLessonRead | null> {
  const target = prLessonTargetOf(card);
  if (!card || !target) return null;
  if (target.kind === 'closed') return { kind: 'closed', card };

  const answer = await within(
    loadLessonResult(target.slug, target.login).catch(() => 'failed' as const),
    PAGE_READ_TIMEOUT_MS,
  );
  if (answer === TIMED_OUT || answer === 'failed') return null;
  // No public result for the author, or a lesson closed since the card was read: the neutral line.
  if (!answer || answer.kind === 'stub') return { kind: 'closed', card };
  const result = answer.value;
  // Only the author's result takes reactions, and only the author's is the pull request's.
  if (!isAuthorResult(result)) return null;

  // A pick back from the sign-in this browser started; `?react=` on a link alone picks nothing.
  const pick = reactionParamOf(react);
  const returned = pick && (await hasReactionMark(result.head.slug, result.login, pick)) ? pick : null;
  const own = isOwnResult(await viewerLogin(), result.login);
  const mine = own
    ? TIMED_OUT
    : await within(loadMyResultReaction(result.head.slug, result.login), PAGE_READ_TIMEOUT_MS);
  // A slow read of the visitor's own reaction leaves the buttons as for a visitor without the sign-in.
  const { canReact, reaction } = mine === TIMED_OUT ? { canReact: false, reaction: null } : mine;
  return { kind: 'lesson', card, result, viewer: { canReact, mine: reaction, returned, own } };
}
