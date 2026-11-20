import type { LearnLevel, LearnProfile } from '../learn.types';

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
