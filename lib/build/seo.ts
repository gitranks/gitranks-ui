import { BUILD_ABOUT_PATH, BUILD_HOME_PATH, BUILD_PROJECTS_PATH } from './paths';
import { withBuildPreview } from './project-seo';
import { BUILD_HOME_CARD_URL, HOME_CARD } from './share-card';
import { pageMetadata } from '@/lib/seo/page-metadata';

/*
 * What Build's public pages tell search engines and link previews. While Build is open only to some people, the gate
 * also marks every Build page not to be indexed.
 */

const LANDING_TEXT =
  'Pick a project. Your agent brings in the code one small step at a time, you try each step, and at the end you understand what you built.';

/** Build's home, with its picture. */
export const BUILD_HOME_METADATA = withBuildPreview(
  pageMetadata({
    title: { absolute: 'GitRanks Build: build real things with your own AI agent' },
    description: LANDING_TEXT,
    path: BUILD_HOME_PATH,
  }),
  { picture: BUILD_HOME_CARD_URL, alt: HOME_CARD.title, title: 'GitRanks Build' },
);

/** All projects. */
export const BUILD_PROJECTS_METADATA = pageMetadata({
  title: { absolute: 'Projects to build with your own AI agent · GitRanks Build' },
  description:
    'Real, small things to build with your own agent, one step at a time. Each ends in something that works.',
  path: BUILD_PROJECTS_PATH,
});

/** "How Build works": the landing itself, so it names the landing as the page to index. */
export const BUILD_ABOUT_METADATA = {
  ...pageMetadata({
    title: { absolute: 'How GitRanks Build works' },
    description: LANDING_TEXT,
    path: BUILD_ABOUT_PATH,
  }),
  alternates: { canonical: BUILD_HOME_PATH },
};
