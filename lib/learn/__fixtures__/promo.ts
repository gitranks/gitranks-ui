import type { LearnRecord } from '../learn.types';

/** The profile's languages, as the overview passes them to the owner's box. */
export const promoColors = { typescript: '#3178c6', javascript: '#f1e05a' };

/** A record of four lessons. */
export const learnRecord: LearnRecord = {
  login: 'octocat',
  lessons: 4,
  newThings: 7,
  reposHelped: 1,
  topics: [
    'Cache keys',
    'Map key equality',
    'Async iterators',
    'Path normalisation',
    'Rounding',
    'Stream cleanup',
    'Retry timers',
    'Number formatting',
    'Layout caching',
  ],
  prsOpened: 3,
  prsMerged: 2,
};
