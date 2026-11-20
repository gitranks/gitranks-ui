import type { LessonReaction, LessonResultPage } from '@/lib/learn/learn.types';
import type { ContributePrCard } from '@/lib/workspace/contribute.types';

/** What the Learn maintainers page knows of its visitor's reaction, as the result page reads it. */
export type PrLessonViewer = {
  canReact: boolean;
  mine: LessonReaction | null;
  returned: LessonReaction | null;
  own: boolean;
  /** The sign-in prompt, drawn open (the catalogue's board). */
  prompt?: LessonReaction | null;
};

/**
 * What the Learn maintainers page shows for its footer link (`?from=`, Learn spec §9.3): the pull request with its
 * lesson and the author's result, or, while that lesson is not public, the pull request and one neutral line.
 */
export type PrLessonRead =
  | { kind: 'lesson'; card: ContributePrCard; result: LessonResultPage; viewer: PrLessonViewer }
  | { kind: 'closed'; card: ContributePrCard };

/**
 * Which read a footer link's card leads to: none (a Contribute pull request, or no author's login), the neutral line
 * (a Learn pull request whose lesson is not public now), or the author's result on the lesson.
 */
export function prLessonTargetOf(
  card: ContributePrCard | null,
): null | { kind: 'closed' } | { kind: 'result'; slug: string; login: string } {
  if (!card?.learn || !card.contributorLogin) return null;
  if (!card.learn.slug) return { kind: 'closed' };
  return { kind: 'result', slug: card.learn.slug, login: card.contributorLogin };
}
