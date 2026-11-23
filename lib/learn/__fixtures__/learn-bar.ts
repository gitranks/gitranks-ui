import type { LearnBarPlace, LearnBarState } from '../learn-bar';

/** One row of page 7's board: what the bar shows, and where the person is. */
export type LearnBarFixture = { title: string; state: LearnBarState; place: LearnBarPlace | null };

const learner = (patch: Partial<Extract<LearnBarState, { kind: 'learner' }>> = {}): LearnBarState => ({
  kind: 'learner',
  due: 0,
  pullRequests: false,
  pullRequestsNeedYou: 0,
  ...patch,
});

/** The rows of page 7's board, in its order. */
export const learnBarRows: LearnBarFixture[] = [
  { title: '1 · Not signed in', state: { kind: 'visitor' }, place: 'home' },
  { title: '2 · Signed in, Learn not set up yet', state: { kind: 'setup' }, place: 'home' },
  { title: '3 · A learner, with nothing waiting', state: learner(), place: 'home' },
  { title: '4 · Lessons are due', state: learner({ due: 6 }), place: 'home' },
  {
    title: '5 · The person has a pull request sent through GitRanks, and none needs them',
    state: learner({ due: 6, pullRequests: true }),
    place: 'home',
  },
  {
    title: '6 · One of their pull requests needs them',
    state: learner({ due: 6, pullRequests: true, pullRequestsNeedYou: 1 }),
    place: 'home',
  },
  {
    title: '7 · On the list of pull requests or on a pull request, reached from Learn',
    state: learner({ due: 6, pullRequests: true, pullRequestsNeedYou: 1 }),
    place: 'pull-requests',
  },
  { title: '8 · On Settings, reached from Learn', state: learner({ due: 6 }), place: 'settings' },
];

/** The phone rows of page 7's board (Learn's bar only). */
export const learnBarPhoneRows: LearnBarFixture[] = [
  { title: 'Learn, nothing waiting: the row scrolls to reach Settings', state: learner(), place: 'home' },
  { title: 'Learn, lessons due', state: learner({ due: 6 }), place: 'home' },
  {
    title: 'Learn, a pull request needs them and lessons are due',
    state: learner({ due: 6, pullRequests: true, pullRequestsNeedYou: 1 }),
    place: 'home',
  },
  { title: 'Learn, not set up', state: { kind: 'setup' }, place: 'home' },
];
