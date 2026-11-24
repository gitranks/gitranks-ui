import type { Metadata } from 'next';

import {
  LEARN_HOME_PATH,
  LEARN_ISSUES_PATH,
  learnFixAnswersPath,
  learnFixWalkthroughPath,
  learnLessonPath,
} from '../paths';
import type { Walkthrough } from '../walkthrough';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** The longest description search engines show in full. */
const DESCRIPTION_MAX = 158;

const NO_INDEX = { index: false, follow: false } as const;

/** The pull request a walkthrough is about. */
const prOf = (walkthrough: Pick<Walkthrough, 'repo' | 'number'>) => ({
  nameWithOwner: walkthrough.repo,
  number: walkthrough.number,
});

/** A walkthrough's title: the issue's own, else the pull request. */
export const walkthroughTitleOf = (walkthrough: Pick<Walkthrough, 'title' | 'repo' | 'number'>) =>
  walkthrough.title.trim() || `${walkthrough.repo} #${walkthrough.number}`;

/** "How alice fixed acme/widgets #42: 4 questions on the change, with why each answer is right." */
export function walkthroughDescriptionOf(walkthrough: Walkthrough): string {
  const count = walkthrough.parts.length;
  return clipText(
    `How ${walkthrough.fixer} fixed ${walkthrough.repo} #${walkthrough.issueNumber}, in ${count} ${count === 1 ? 'question' : 'questions'} on the change, with why each answer is right.`,
    DESCRIPTION_MAX,
  );
}

/** A fix's walkthrough: indexed, its own address as the canonical. Not here: a plain title, never kept. */
export function learnWalkthroughMetadata(walkthrough: Walkthrough | null): Metadata {
  if (!walkthrough) return { title: 'Fix walkthrough', robots: NO_INDEX };
  return pageMetadata({
    title: `Fix walkthrough: ${walkthroughTitleOf(walkthrough)}`,
    description: walkthroughDescriptionOf(walkthrough),
    path: learnFixWalkthroughPath(prOf(walkthrough)),
  });
}

/**
 * A person's answers: not kept by search engines, which follow its links to the walkthrough, the page they keep (the
 * canonical). Every answers page of a fix holds the same questions.
 */
export function learnAnswersMetadata(walkthrough: Walkthrough | null, login: string, own = false): Metadata {
  const title = own ? 'Your answers' : `${login}'s answers`;
  if (!walkthrough) return { title, robots: { index: false, follow: true } };
  return {
    title: `${title}: ${walkthroughTitleOf(walkthrough)}`,
    robots: { index: false, follow: true },
    alternates: { canonical: learnFixWalkthroughPath(prOf(walkthrough)) },
  };
}

/** The page of a fix whose pages were removed: never kept. */
export const learnFixRemovedMetadata = (): Metadata => ({ title: 'This page was removed', robots: NO_INDEX });

/** A walkthrough's structured data: a `LearningResource` about the fix, and its breadcrumbs. */
export function learnWalkthroughJsonLd(walkthrough: Walkthrough): object[] {
  const pr = prOf(walkthrough);
  const url = absoluteUrl(learnFixWalkthroughPath(pr));
  const name = walkthroughTitleOf(walkthrough);
  const middle = walkthrough.lesson
    ? { name: walkthrough.lesson.title, item: absoluteUrl(learnLessonPath(walkthrough.lesson.slug)) }
    : { name: 'Issues', item: absoluteUrl(LEARN_ISSUES_PATH) };
  const crumbs = [{ name: 'Learn', item: absoluteUrl(LEARN_HOME_PATH) }, middle, { name, item: url }];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': `${url}#walkthrough`,
      url,
      name,
      description: walkthroughDescriptionOf(walkthrough),
      inLanguage: 'en',
      learningResourceType: 'Fix walkthrough',
      isAccessibleForFree: true,
      ...(walkthrough.language ? { teaches: walkthrough.language } : {}),
      ...(walkthrough.lesson
        ? { isBasedOn: { '@type': 'LearningResource', name: walkthrough.lesson.title, url: middle.item } }
        : {}),
      creator: { '@type': 'Person', name: walkthrough.fixer, url: `https://github.com/${walkthrough.fixer}` },
      about: { '@type': 'SoftwareSourceCode', codeRepository: `https://github.com/${walkthrough.repo}` },
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ];
}

/** A person's answers page, as the walkthrough links it. */
export const answersPathOf = (walkthrough: Pick<Walkthrough, 'repo' | 'number'>, login: string) =>
  learnFixAnswersPath(prOf(walkthrough), login);
