import type { LearnRecord } from '../../learn.types';
import type { LearnPublicLesson, LearnPublicProgress } from '../public-progress';

/** octocat's public record: five public lessons, two of them practice, one pull request merged. */
export const publicRecord: LearnRecord = {
  login: 'octocat',
  lessons: 5,
  newThings: 9,
  topics: ['Cache keys', 'Retry timers'],
  prsOpened: 3,
  prsMerged: 1,
  reposHelped: 1,
};

const lesson = (fields: Partial<LearnPublicLesson> & Pick<LearnPublicLesson, 'slug' | 'title'>): LearnPublicLesson => ({
  kind: 'OWN',
  repo: 'driftwood-js/driftwood',
  issueNumber: 934,
  passedAt: '2026-11-12T10:00:00.000Z',
  learned: [],
  merged: false,
  prNumber: null,
  prUrl: null,
  ...fields,
});

/** A page of octocat's public lessons, newest pass first: merged, open, practice. */
export const publicProgress: LearnPublicProgress = {
  record: publicRecord,
  total: 5,
  items: [
    lesson({
      slug: 'route-cache-miss-8f3k',
      title: 'Why the layouts were built twice on /docs/',
      merged: true,
      prNumber: 961,
      prUrl: 'https://github.com/driftwood-js/driftwood/pull/961',
      learned: [
        { stepId: 's2', number: 2, parts: ['cause'], title: 'The cache key is the raw path' },
        { stepId: 's3', number: 3, parts: ['fix'], title: 'Normalise the path before the lookup' },
      ],
    }),
    lesson({
      slug: 'empty-config-files-abcdef',
      title: 'An empty config file crashes the loader',
      repo: 'acme/config-kit',
      issueNumber: 212,
      passedAt: '2026-11-08T10:00:00.000Z',
      learned: [{ stepId: 's1', number: 1, parts: ['before'], title: 'How the loader reads a file' }],
    }),
    lesson({
      kind: 'PRACTICE',
      slug: 'retry-backoff-jitter-2m9q',
      title: 'Retries that all fire at once',
      repo: 'harbor-io/harbor',
      issueNumber: 140,
      passedAt: '2026-11-03T10:00:00.000Z',
      learned: [{ stepId: 's4', number: 4, parts: ['connects'], title: 'Jitter spreads the retries' }],
    }),
  ],
};
