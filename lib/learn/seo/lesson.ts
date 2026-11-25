import type { Metadata } from 'next';

import type { LearnAddress } from '../address-gate';
import type { LearnLesson } from '../lesson-page';
import { learnFactCardUrlOf, learnLessonCardUrlOf, learnShareTitleOf } from '../lesson-share-card';
import { courseHrefOf, LEARN_HOME_PATH, learnFactPath, learnLessonMarkdownPath, learnLessonPath } from '../paths';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** The longest description search engines show in full. */
const DESCRIPTION_MAX = 158;

const NO_INDEX = { index: false, follow: false } as const;

/**
 * A lesson's Markdown as plain words: no placed examples or visuals, no code blocks, no headings' hashes, no emphasis,
 * links reduced to their words, inline code to its text; one line.
 */
export function lessonPlainTextOf(body: string): string {
  return body
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .split('\n')
    .filter((line) => !/^\s*\[\[(example|visual):[^\]]*\]\]\s*$/.test(line))
    .map((line) => line.replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, ''))
    .join(' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A lesson's description: its own words, clipped to what search engines show. */
export const lessonDescriptionOf = (lesson: Pick<LearnLesson, 'body'>): string =>
  clipText(lessonPlainTextOf(lesson.body), DESCRIPTION_MAX);

/** What a lesson's metadata reads. */
type MetadataLesson = Pick<
  LearnLesson,
  'slug' | 'title' | 'body' | 'publishedAt' | 'changedAt' | 'fact' | 'course' | 'group'
>;

/**
 * A lesson of ours: its title, its own words as the description, its address as the canonical, its Markdown copy as
 * an alternate, and an article preview with its picture. Opened from a shared fact (`fact`, the address with `?fact`),
 * the preview is the fact's own: its title, a line naming the lesson, its picture, and the fact's address as its URL,
 * since some sites read the preview from that URL; the canonical stays the lesson's.
 */
export function learnLessonMetadata(lesson: MetadataLesson, { fact = false }: { fact?: boolean } = {}): Metadata {
  const description = lessonDescriptionOf(lesson);
  const metadata = pageMetadata({
    title: lesson.title,
    description,
    path: learnLessonPath(lesson.slug),
    openGraphType: 'article',
    publishedTime: lesson.publishedAt,
  });
  const shared = fact && lesson.fact?.text.trim() ? lesson.fact : null;
  const preview = shared
    ? {
        title: learnShareTitleOf(shared.title),
        description: `A fact from the lesson “${lesson.title}”.`,
        page: learnFactPath(lesson.slug),
        picture: learnFactCardUrlOf(lesson),
        alt: shared.title,
      }
    : {
        title: learnShareTitleOf(lesson.title),
        description,
        page: learnLessonPath(lesson.slug),
        picture: learnLessonCardUrlOf(lesson),
        alt: lesson.title,
      };
  const images = [{ url: absoluteUrl(preview.picture), ...SOCIAL_CARD_SIZE, alt: preview.alt }];
  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'text/markdown': learnLessonMarkdownPath(lesson.slug) } },
    openGraph: {
      ...metadata.openGraph,
      url: preview.page,
      title: preview.title,
      description: preview.description,
      images,
    },
    twitter: {
      ...metadata.twitter,
      card: 'summary_large_image',
      title: preview.title,
      description: preview.description,
      images,
    },
  };
}

/** A lesson's structured data: a `LearningResource` in its course, and its breadcrumbs (Learn, the course, the lesson). */
export function learnLessonJsonLd(lesson: MetadataLesson): object[] {
  const url = absoluteUrl(learnLessonPath(lesson.slug));
  const course = absoluteUrl(courseHrefOf(lesson.course));
  const crumbs = [
    { name: 'Learn', item: absoluteUrl(LEARN_HOME_PATH) },
    { name: lesson.course.title, item: course },
    { name: lesson.title, item: url },
  ];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      '@id': `${url}#lesson`,
      url,
      name: lesson.title,
      description: lessonDescriptionOf(lesson),
      inLanguage: 'en',
      learningResourceType: 'Lesson',
      isAccessibleForFree: true,
      datePublished: lesson.publishedAt,
      dateModified: lesson.changedAt,
      image: absoluteUrl(learnLessonCardUrlOf(lesson)),
      isPartOf: { '@type': 'Course', name: lesson.course.title, url: course },
      about: lesson.group.title,
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ];
}

/** The title of a paused or a removed lesson's page. */
export const LESSON_GONE_TITLE = { PAUSED: 'This lesson is paused', REMOVED: 'This lesson was removed' } as const;

/** A paused or removed lesson's page: its state as the title, never kept by search engines. */
export function learnLessonGoneMetadata(address: Pick<LearnAddress, 'state'> | null): Metadata {
  const title = address?.state === 'PAUSED' ? LESSON_GONE_TITLE.PAUSED : LESSON_GONE_TITLE.REMOVED;
  return { title, robots: NO_INDEX };
}
