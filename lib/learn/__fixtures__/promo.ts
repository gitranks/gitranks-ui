import type { LearnRecord } from '../learn.types';
import type { ShownPromo } from '../learn-promo';

/** A signed-in user Learn may suit, on the home page: a first repository in a new language. */
export const landingPromo: ShownPromo = {
  reason: 'You started your first TypeScript repo 3 weeks ago.',
  language: 'TypeScript',
  issues: [],
};

/** The same user on their own profile, with issues it could teach on. */
export const profilePromo: ShownPromo = {
  ...landingPromo,
  issues: [
    {
      title: 'Nested layouts re-render on every navigation',
      repo: 'driftwood-js/driftwood',
      number: 871,
      language: 'TypeScript',
      topic: 'cache keys and Map equality',
    },
    {
      title: 'default color serialization truncates channel bytes',
      repo: 'processing/p5.js',
      number: 9124,
      language: 'JavaScript',
      topic: 'number formatting and rounding',
    },
    {
      title: 'Retry timer keeps running after the stream closes',
      repo: 'tidepool/tide',
      number: 312,
      language: 'TypeScript',
      topic: 'async iterators and cleanup',
    },
  ],
};

/** The profile's languages, as the overview passes them to the block. */
export const promoColors = { typescript: '#3178c6', javascript: '#f1e05a' };

/** A record of four lessons. */
export const learnRecord: LearnRecord = {
  lessons: 4,
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
