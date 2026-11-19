import type { Metadata } from 'next';

import type { LessonHead, LessonPage, LessonVisibility } from './learn.types';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH, lessonPath, lessonResultPath } from './learn-path';
import { type LessonPageAnswer, type LessonResultAnswer, resultFiguresOf, stubTextOf } from './lesson-public';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

const NO_INDEX = { index: false, follow: false } as const;
/** A page search engines do not keep, whose links they still follow (a result page's lesson and the maintainers' page). */
const NO_INDEX_FOLLOW = { index: false, follow: true } as const;

/** A closed lesson's link, or one with nothing behind it: its stub's words, never kept by search engines. */
const stubMetadata = (visibility: LessonVisibility | null): Metadata => ({
  title: visibility ? stubTextOf(visibility).title : 'Lesson not found',
  robots: NO_INDEX,
});

/** "the fix for driftwood-js/driftwood issue #871" */
function fixOf(head: Pick<LessonHead, 'subject'>): string {
  const { repo, issue } = head.subject;
  if (repo && issue) return `the fix for ${repo} issue #${issue}`;
  return repo ? `a fix in ${repo}` : 'a fix';
}

/** A shared lesson's description: the page's, its link preview's and its structured data's. */
function lessonDescriptionOf({ head, steps }: LessonPage): string {
  return clipText(
    `A short lesson on ${fixOf(head)}, written by ${head.author.agentName}: ${steps.length} steps with a question each. Read it, then sign in with GitHub to take it. Made with GitRanks Learn.`,
    158,
  );
}

/** A shared lesson's title, description and link preview; a stub's title, not indexed. */
export function lessonPageMetadata(answer: LessonPageAnswer): Metadata {
  if (answer?.kind !== 'found') return stubMetadata(answer?.visibility ?? null);
  const { head } = answer.value;
  const description = lessonDescriptionOf(answer.value);
  const path = lessonPath(head.slug);
  return head.publishedAt
    ? pageMetadata({ title: head.title, description, path, openGraphType: 'article', publishedTime: head.publishedAt })
    : pageMetadata({ title: head.title, description, path });
}

/**
 * A result page's title, description and link preview, at the account's current login, and where its facts are as
 * JSON; a stub's title. Never kept by search engines: it names a person and repeats the lesson, whose page is the one
 * indexed, so its links are followed there.
 */
export function lessonResultMetadata(answer: LessonResultAnswer): Metadata {
  if (answer?.kind !== 'found') return stubMetadata(answer?.visibility ?? null);
  const result = answer.value;
  const figures = resultFiguresOf(result);
  const description = clipText(
    `${result.login} took a short lesson on ${fixOf(result.head)} and passed it: ${figures.passed} of ${figures.total} steps, ${figures.knew} known before, ${figures.firstTry} first try. A record of GitRanks Learn.`,
    158,
  );
  const path = lessonResultPath(result.head.slug, result.login);
  const metadata = pageMetadata({
    title: `${result.login} passed “${result.head.title}”`,
    description,
    path,
    openGraphType: 'article',
    publishedTime: result.passedAt,
  });
  return {
    ...metadata,
    robots: NO_INDEX_FOLLOW,
    alternates: { ...metadata.alternates, types: { 'application/json': `${path}.json` } },
  };
}

/** The page for maintainers: open to everyone and indexed, as every Learn pull request's footer links it. */
export const LEARN_MAINTAINERS_METADATA: Metadata = pageMetadata({
  title: 'GitRanks Learn for maintainers',
  description:
    'What a pull request made with GitRanks Learn is: an agent wrote the fix, and its author passed a check on it. Your repository rules apply.',
  path: LEARN_MAINTAINERS_PATH,
});

/** Learn's front door: indexed once it is open to visitors (Learn open to everyone), not before. */
export function learnHomeMetadata(open: boolean): Metadata {
  const metadata = pageMetadata({
    title: 'Learn from real open-source fixes',
    description:
      'Your coding agent fixes a real open-source issue. You get a 10-minute lesson on what was wrong and why the fix works. Pass the check, and the pull request opens in your name.',
    path: LEARN_PATH,
  });
  return open ? metadata : { ...metadata, robots: NO_INDEX };
}

/**
 * `/learn/about`, the front door as a signed-in user reads it: its canonical address is `/learn`, and it is never
 * indexed, so search engines see one front door.
 */
export const LEARN_ABOUT_METADATA: Metadata = {
  ...pageMetadata({
    title: 'How Learn works',
    description:
      'Your coding agent fixes a real open-source issue. You get a 10-minute lesson on what was wrong and why the fix works. Pass the check, and the pull request opens in your name.',
    path: LEARN_PATH,
  }),
  robots: NO_INDEX,
};

/**
 * A shared lesson's structured data: the lesson as a `LearningResource` (the repository and language of the fix, the
 * person who made it with their agent, its steps: what the page shows), and where it sits on the site. Learn's front door is a crumb only
 * once it is open to visitors.
 */
export function lessonJsonLd(page: LessonPage, { frontDoorOpen }: { frontDoorOpen: boolean }): object[] {
  const { head, steps } = page;
  const url = absoluteUrl(lessonPath(head.slug));
  const { repo } = head.subject;
  const login = head.author.login;
  const crumbs = [
    { name: 'Home', item: absoluteUrl('/') },
    ...(frontDoorOpen ? [{ name: 'Learn', item: absoluteUrl(LEARN_PATH) }] : []),
    { name: head.title, item: url },
  ];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': `${url}#lesson`,
      url,
      name: head.title,
      description: lessonDescriptionOf(page),
      inLanguage: 'en',
      learningResourceType: 'Lesson',
      isAccessibleForFree: true,
      ...(head.publishedAt ? { datePublished: head.publishedAt } : {}),
      ...(repo
        ? {
            about: {
              '@type': 'SoftwareSourceCode',
              name: repo,
              codeRepository: `https://github.com/${repo}`,
              ...(head.language ? { programmingLanguage: head.language } : {}),
            },
          }
        : {}),
      ...(login
        ? {
            author: {
              '@type': 'Person',
              name: login,
              url: absoluteUrl(`/profile/${encodeURIComponent(login)}`),
              sameAs: `https://github.com/${encodeURIComponent(login)}`,
            },
          }
        : {}),
      publisher: { '@id': ORGANIZATION_ID },
      hasPart: steps.map((step, index) => ({ '@type': 'CreativeWork', position: index + 1, name: step.title })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ];
}
