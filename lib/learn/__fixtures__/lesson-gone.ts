import type { LearnAddress } from '../address-gate';
import type { LearnLessonMine } from '../lesson-page';

/** A paused lesson's address, as the boards name it. */
export const pausedAddress: LearnAddress = {
  state: 'PAUSED',
  movedTo: null,
  title: 'Find duplicates in one pass with a set',
  course: { slug: 'algorithms', title: 'Algorithms and data structures' },
};

/** The same lesson, removed. */
export const removedAddress: LearnAddress = { ...pausedAddress, state: 'REMOVED' };

/** A learner who learned it on 14 Nov. */
export const goneLearnerMine: Pick<LearnLessonMine, 'depth' | 'known' | 'learnedAt'> = {
  depth: 'LEARNED',
  known: false,
  learnedAt: '2026-11-14T09:30:00.000Z',
};
