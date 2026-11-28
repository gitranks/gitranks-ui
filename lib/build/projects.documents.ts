import { BUILD_MINE, doc, PROJECT_CARD } from './build.documents';
import type { BuildMine, BuildProjectCard } from './types';

/* The list of projects: the same for everyone; and the signed-in person's builds, for their place on each card. */

/** Every live project, in our order: the same for everyone. */
export const BuildProjectsDocument = doc<{ buildProjects: BuildProjectCard[] }>(
  `query BuildProjects { buildProjects { ${PROJECT_CARD} } }`,
);

/** The signed-in person's builds of every project they touched; null signed out. */
export const BuildProjectsMineDocument = doc<{ buildProjectsMine: BuildMine[] | null }>(
  `query BuildProjectsMine { buildProjectsMine { ${BUILD_MINE} } }`,
);
