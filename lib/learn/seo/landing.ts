import type { Metadata } from 'next';

import type { LearnCourseCard } from '../course';
import { LEARN_CARD_HEADLINE, learnCoursesCardUrlOf } from '../course-share-card';
import { LANDING_QUESTIONS, LANDING_SEARCH_TITLE, LANDING_TEXT } from '../landing';
import type { LearnLesson } from '../lesson-page';
import { learnLessonCardUrlOf } from '../lesson-share-card';
import { LEARN_HOME_PATH, LEARN_LANDING_MARKDOWN_PATH, learnLessonPath } from '../paths';
import { learnCoursesJsonLd, learnIndexedWhile, withPreview } from './course';
import { lessonDescriptionOf } from './lesson';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** The landing's description: its own words, clipped to what search engines show. */
export const LANDING_DESCRIPTION = clipText(LANDING_TEXT, 158);

/**
 * `/learn`: the landing is the page search engines and agents get. Only while Learn is open to everyone (`open`) is it
 * indexed and its Markdown copy named as an alternate: `/learn.md` is not found before then.
 */
export function learnLandingMetadata(courses: readonly Pick<LearnCourseCard, 'lessons'>[], open: boolean): Metadata {
  const metadata = withPreview(
    pageMetadata({
      title: { absolute: LANDING_SEARCH_TITLE },
      description: LANDING_DESCRIPTION,
      path: LEARN_HOME_PATH,
    }),
    {
      title: 'GitRanks Learn',
      description: LEARN_CARD_HEADLINE,
      page: LEARN_HOME_PATH,
      picture: learnCoursesCardUrlOf(courses),
      alt: 'GitRanks Learn',
    },
    LEARN_LANDING_MARKDOWN_PATH,
  );
  if (open) return metadata;
  return learnIndexedWhile({ ...metadata, alternates: { canonical: metadata.alternates?.canonical } }, false);
}

/**
 * The landing's structured data: the list of courses, the lesson at the top as a learning resource (when there is
 * one), and the questions as an FAQ.
 */
export function learnLandingJsonLd(
  courses: readonly Pick<LearnCourseCard, 'slug' | 'name'>[],
  lesson: LearnLesson | null,
): object[] {
  const payloads: object[] = courses.length ? learnCoursesJsonLd(courses) : [];
  if (lesson) {
    payloads.push({
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: lesson.title,
      url: absoluteUrl(learnLessonPath(lesson.slug)),
      description: lessonDescriptionOf(lesson),
      learningResourceType: 'Lesson',
      inLanguage: 'en',
      isAccessibleForFree: true,
      dateModified: lesson.changedAt,
      image: absoluteUrl(learnLessonCardUrlOf(lesson)),
      isPartOf: { '@type': 'Course', name: lesson.course.title },
      publisher: { '@id': ORGANIZATION_ID },
    });
  }
  payloads.push({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_QUESTIONS.map((each) => ({
      '@type': 'Question',
      name: each.question,
      acceptedAnswer: { '@type': 'Answer', text: each.answer },
    })),
  });
  return payloads;
}
