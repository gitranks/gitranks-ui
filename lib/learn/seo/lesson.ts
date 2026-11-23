import type { Metadata } from 'next';

import type { LearnAddress } from '../address-gate';
import type { LearnLesson } from '../lesson-page';
import { learnLessonPath } from '../paths';
import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';

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

/** A lesson of ours: its title, its own words as the description, its address as the canonical, an article preview. */
export function learnLessonMetadata(lesson: Pick<LearnLesson, 'slug' | 'title' | 'body' | 'publishedAt'>): Metadata {
  return pageMetadata({
    title: lesson.title,
    description: lessonDescriptionOf(lesson),
    path: learnLessonPath(lesson.slug),
    openGraphType: 'article',
    publishedTime: lesson.publishedAt,
  });
}

/** The title of a paused or a removed lesson's page. */
export const LESSON_GONE_TITLE = { PAUSED: 'This lesson is paused', REMOVED: 'This lesson was removed' } as const;

/** A paused or removed lesson's page: its state as the title, never kept by search engines. */
export function learnLessonGoneMetadata(address: Pick<LearnAddress, 'state'> | null): Metadata {
  const title = address?.state === 'PAUSED' ? LESSON_GONE_TITLE.PAUSED : LESSON_GONE_TITLE.REMOVED;
  return { title, robots: NO_INDEX };
}
