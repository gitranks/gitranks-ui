import { BUILD_MINE, doc, PROJECT_CARD, WAITING_TEST } from './build.documents';
import type { BuildHome } from './types';

/* Build's home for a person with a build. The landing reads the projects (`projects.documents.ts`). */

/** The builds in progress, the tests that wait and three projects to build next; null when Build is not open to them. */
export const BuildHomeDocument = doc<{ buildHome: BuildHome | null }>(
  `query BuildHome { buildHome { builds { ${BUILD_MINE} } tests { ${WAITING_TEST} } next { ${PROJECT_CARD} } } }`,
);
