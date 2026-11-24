import type { ContributeSides } from './contribute.types';

/** Who a workspace page is for: both sides, a learner (no Contribute), or a contributor (no Learn). */
export type Audience = 'both' | 'learner' | 'contributor';

/** The sides unknown, or neither yet (connected and nothing else): both, so no part is closed before they choose. */
export function audienceOf(sides: ContributeSides | null | undefined): Audience {
  if (!sides || sides.contribute === sides.learn) return 'both';
  return sides.learn ? 'learner' : 'contributor';
}
