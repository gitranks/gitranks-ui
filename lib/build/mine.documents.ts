import { BUILD_MINE, doc, WAITING_TEST } from './build.documents';
import type { BuildMineList } from './types';

/* My builds, and removing a build in progress. Both are the signed-in person's own. */

/** The tests that wait, the builds in progress and the built ones; null when Build is not open to the person. */
export const BuildMineDocument = doc<{ buildMine: BuildMineList | null }>(
  `query BuildMine { buildMine { tests { ${WAITING_TEST} } inProgress { ${BUILD_MINE} } built { ${BUILD_MINE} } } }`,
);

/** Removes a build in progress; a built one is refused. */
export const RemoveBuildDocument = doc<{ removeBuild: boolean | null }, { build: string }>(
  'mutation RemoveBuild($build: String!) { removeBuild(build: $build) }',
);
