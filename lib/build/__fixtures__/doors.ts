import type { BuildDoors, BuildMine, BuildProjectCard } from '../types';
import { keyValueDatabaseInProgress, keyValueDatabaseTestLeft } from './builds';
import { gitCard, interpreterCard, jsonParserCard, keyValueDatabaseCard } from './projects';

/*
 * The doors into Build as the approved designs draw them, for the course "Algorithms and data structures": the
 * projects that name it, and the person's builds of them.
 */

/** A search engine, the third thing the course's line names on the board with many projects. */
export const searchEngineCard: BuildProjectCard = {
  ...keyValueDatabaseCard,
  slug: 'search-engine',
  name: 'Build a search engine',
  thing: 'a search engine',
  line: 'Index your files and find the best match first.',
  baseSteps: 16,
};

/** The key-value database at step 9 of 14. */
export const keyValueDatabaseStepNine: BuildMine = {
  ...keyValueDatabaseInProgress,
  state: { kind: 'in_progress', step: { slug: 'compact-the-log', title: 'Compact the log', number: 9 }, of: 14 },
};

/** The key-value database, built. */
export const keyValueDatabaseBuilt: BuildMine = {
  ...keyValueDatabaseInProgress,
  build: 'b-kv-py-built',
  state: {
    kind: 'built',
    builtAt: '2026-11-20T12:00:00.000Z',
    score: 9,
    gold: { kind: 'opens_on', date: '2026-11-27' },
  },
  lastStepAt: '2026-11-20T11:00:00.000Z',
};

/** The interpreter at step 4 of 18. */
export const interpreterStepFour: BuildMine = {
  ...keyValueDatabaseInProgress,
  build: 'b-int-ts',
  project: { slug: interpreterCard.slug, name: interpreterCard.name, thing: interpreterCard.thing },
  language: 'typescript',
  state: { kind: 'in_progress', step: { slug: 'read-numbers', title: 'Read numbers', number: 4 }, of: 18 },
  lastStepAt: '2026-11-25T18:00:00.000Z',
};

/** One project names the course, not started. */
export const doorsOne: BuildDoors = { projects: [keyValueDatabaseCard], builds: [] };

/** Two projects, not started: the course's line on the course's own board. */
export const doorsTwo: BuildDoors = { projects: [keyValueDatabaseCard, interpreterCard], builds: [] };

/** Five projects: three names, then "2 more". */
export const doorsMany: BuildDoors = {
  projects: [keyValueDatabaseCard, interpreterCard, searchEngineCard, gitCard, jsonParserCard],
  builds: [],
};

/** The person's place: the key-value database built, the interpreter at step 4. */
export const doorsPlaces: BuildDoors = {
  projects: [keyValueDatabaseCard, interpreterCard],
  builds: [interpreterStepFour, keyValueDatabaseBuilt],
};

/** A build in progress of the course's project. */
export const doorsInProgress: BuildDoors = { projects: [keyValueDatabaseCard], builds: [keyValueDatabaseStepNine] };

/** Every step built, the test left. */
export const doorsTestLeft: BuildDoors = { projects: [keyValueDatabaseCard], builds: [keyValueDatabaseTestLeft] };

/** The course's only project, built: nothing left to build. */
export const doorsAllBuilt: BuildDoors = { projects: [keyValueDatabaseCard], builds: [keyValueDatabaseBuilt] };

/** No project names the course. */
export const doorsNone: BuildDoors = { projects: [], builds: [] };
