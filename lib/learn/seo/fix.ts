import type { Metadata } from 'next';

import type { LearnFixPage } from '../fix-page';
import { LEARN_HOME_PATH, LEARN_ISSUES_PATH, learnFixPath, learnLessonPath } from '../paths';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import type { PrTimeline } from '@/lib/workspace/pr-timeline.types';
import { prTimelineMarkdownPath } from '@/lib/workspace/pr-timeline-path';

/*
 * The public page of a fix for search engines: "Learn from it" is the page they keep for a Learn fix ("How it was
 * made" points to it as its canonical); it is an `Article` about the pull request, with its breadcrumbs.
 */

const DESCRIPTION_MAX = 158;
const NO_INDEX = { index: false, follow: false } as const;

/** The page's title: the pull request's own, else the repository and its number. */
export const fixTitleOf = (timeline: Pick<PrTimeline, 'title' | 'nameWithOwner' | 'number'>) =>
  timeline.title?.trim() || `${timeline.nameWithOwner} #${timeline.number}`;

/** "How octocat fixed acme/widgets #42 with their agent: 4 questions on the change, and the lesson it used." */
export function fixDescriptionOf(timeline: PrTimeline, fix: LearnFixPage): string {
  const what = [
    fix.questions ? `${fix.questions} ${fix.questions === 1 ? 'question' : 'questions'} on the change` : null,
    fix.lesson ? `the lesson it used, ${fix.lesson.title}` : null,
  ].filter(Boolean);
  const head = `How ${fix.fixer} fixed ${timeline.nameWithOwner} #${timeline.issue.number} with their agent`;
  return clipText(what.length ? `${head}: ${what.join(', and ')}.` : `${head}.`, DESCRIPTION_MAX);
}

/** "Learn from it": indexed, its own address the canonical, its Markdown copy beside it. Not here: never kept. */
export function learnFixMetadata(timeline: PrTimeline | null, fix: LearnFixPage | null): Metadata {
  if (!timeline || !fix) return { title: 'Learn from a fix', robots: NO_INDEX };
  const pr = { nameWithOwner: timeline.nameWithOwner, number: timeline.number };
  const base = pageMetadata({
    title: `Learn from a fix: ${fixTitleOf(timeline)}`,
    description: fixDescriptionOf(timeline, fix),
    path: learnFixPath(pr),
    openGraphType: 'article',
    publishedTime: timeline.openedAt,
  });
  return {
    ...base,
    alternates: { ...base.alternates, types: { 'text/markdown': prTimelineMarkdownPath(pr) } },
    robots: { index: true, follow: true },
  };
}

/** A fix's page as structured data: an `Article` about the pull request, and its breadcrumbs. */
export function learnFixJsonLd(pr: PrRef, timeline: PrTimeline, fix: LearnFixPage): object[] {
  const url = absoluteUrl(learnFixPath(pr));
  const name = fixTitleOf(timeline);
  const middle = fix.lesson
    ? { name: fix.lesson.title, item: absoluteUrl(learnLessonPath(fix.lesson.slug)) }
    : { name: 'Issues', item: absoluteUrl(LEARN_ISSUES_PATH) };
  const crumbs = [{ name: 'Learn', item: absoluteUrl(LEARN_HOME_PATH) }, middle, { name, item: url }];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#fix`,
      url,
      headline: clipText(name, 110),
      description: fixDescriptionOf(timeline, fix),
      inLanguage: 'en',
      datePublished: timeline.openedAt,
      dateModified: timeline.modifiedAt,
      isAccessibleForFree: true,
      author: { '@type': 'Person', name: fix.fixer, url: `https://github.com/${fix.fixer}` },
      publisher: { '@id': ORGANIZATION_ID },
      about: {
        '@type': 'SoftwareSourceCode',
        name: timeline.nameWithOwner,
        codeRepository: `https://github.com/${timeline.nameWithOwner}`,
      },
      ...(fix.lesson ? { teaches: fix.lesson.title } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ];
}
