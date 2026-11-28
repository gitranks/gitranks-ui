import { BUILD_MINE, doc, PROJECT_CARD, STEP_REF } from './build.documents';
import type { BuildProjectMine, BuildProjectPage } from './types';

/* A project's page: the same for everyone; and the signed-in person's side of it. */

const PROJECT_PAGE = `${PROJECT_CARD} about playground needsFull { language name version command why }
  base { ${STEP_REF} } partsFull { slug name line steps { ${STEP_REF} } } courses { slug name } next { ${PROJECT_CARD} }`;

/** A live project, whole: the same for everyone. Null when it is not live. */
export const BuildProjectDocument = doc<{ buildProject: BuildProjectPage | null }, { slug: string }>(
  `query BuildProject($slug: String!) { buildProject(slug: $slug) { ${PROJECT_PAGE} } }`,
);

/** The signed-in person's builds of one project; null signed out. */
export const BuildProjectMineDocument = doc<{ buildProjectMine: BuildProjectMine | null }, { slug: string }>(
  `query BuildProjectMine($slug: String!) {
    buildProjectMine(slug: $slug) { builds { ${BUILD_MINE} } agentConnected say }
  }`,
);
