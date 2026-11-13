import type { LearnLevel, LearnProfile, MyLesson } from '../learn.types';

const level = (language: string, value: number, hint: string | null, guessed = true): LearnLevel => ({
  language,
  level: value,
  guessed,
  hint,
});

/** A first visit: no goal yet, the levels guessed from the user's public work. */
export const emptyProfile: LearnProfile = {
  goalKind: null,
  goalValue: null,
  levels: [
    level('JavaScript', 2, '14 repos, since 2023'),
    level('TypeScript', 1, '2 repos, since Oct 2026'),
    level('Python', 0, 'No public repos'),
  ],
  focus: [],
  updatedAt: null,
};

/** A saved profile: learn TypeScript, one level set by the user, the others still guessed. */
export const filledProfile: LearnProfile = {
  goalKind: 'LANGUAGE',
  goalValue: 'TypeScript',
  levels: [
    level('JavaScript', 2, '14 repos, since 2023'),
    level('TypeScript', 1, '2 repos, since Oct 2026', false),
    level('Python', 0, 'No public repos'),
  ],
  focus: ['LANGUAGE', 'PATTERNS'],
  updatedAt: '2026-10-27T18:00:00.000Z',
};

/** A user's lessons in every state: their own Learn attempts, and a shared lesson they passed. */
export const myLessons: MyLesson[] = [
  {
    slug: null,
    attemptId: 'A_3',
    title: 'Keep trailing comments when formatting match arms',
    repo: 'fern-lang/fern',
    state: 'IN_PROGRESS',
    passedAt: null,
  },
  {
    slug: 'route-cache-miss-8f3k',
    attemptId: 'A_1',
    title: 'Two spellings of one route got two cache entries',
    repo: 'driftwood-js/driftwood',
    state: 'PR_OPEN',
    passedAt: '2026-10-28T11:20:00.000Z',
  },
  {
    slug: 'retry-backoff-jitter-2m9q',
    attemptId: null,
    title: 'Why the retry loop needed jitter',
    repo: 'harbor-io/harbor',
    state: 'PASSED',
    passedAt: '2026-10-25T16:05:00.000Z',
  },
  {
    slug: null,
    attemptId: 'A_2',
    title: 'Escape pipes in table cells',
    repo: 'quill-md/quill',
    state: 'ENDED',
    passedAt: null,
  },
];
