import type { Metadata } from 'next';

import type { LearnAddress } from '../address-gate';
import type { LearnCourse, LearnCourseCard } from '../course';
import {
  courseShareDescriptionOf,
  LEARN_CARD_HEADLINE,
  learnCourseCardUrlOf,
  learnCoursesCardUrlOf,
} from '../course-share-card';
import { learnShareTitleOf } from '../lesson-share-card';
import {
  courseHrefOf,
  courseMarkdownHrefOf,
  LEARN_COURSES_MARKDOWN_PATH,
  LEARN_COURSES_PATH,
  LEARN_HOME_PATH,
  learnLessonPath,
} from '../paths';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** The longest description search engines show in full. */
const DESCRIPTION_MAX = 158;

const NO_INDEX = { index: false, follow: false } as const;
const NO_INDEX_FOLLOW = { index: false, follow: true } as const;

/** A course's description: its own words about itself, clipped to what search engines show. */
export const courseDescriptionOf = (course: Pick<LearnCourse, 'about'>): string =>
  clipText(course.about.replace(/\s+/g, ' ').trim(), DESCRIPTION_MAX);

/** The description of all courses. */
export const COURSES_DESCRIPTION =
  'Every course of GitRanks Learn: short lessons, each with one question. Topics in any language, and languages.';

/** A preview: its title and description, the page, its picture and the picture's words. */
type Preview = { title: string; description: string; page: string; picture: string; alt: string };

/** The metadata of a page with a preview, its Markdown copy as an alternate. */
export function withPreview(metadata: Metadata, preview: Preview, markdown: string): Metadata {
  const images = [{ url: absoluteUrl(preview.picture), ...SOCIAL_CARD_SIZE, alt: preview.alt }];
  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'text/markdown': markdown } },
    openGraph: { ...metadata.openGraph, title: preview.title, description: preview.description, images },
    twitter: {
      ...metadata.twitter,
      card: 'summary_large_image',
      title: preview.title,
      description: preview.description,
      images,
    },
  };
}

/** What a course's metadata reads. */
type MetadataCourse = Pick<
  LearnCourse,
  'slug' | 'name' | 'about' | 'kind' | 'languages' | 'lessons' | 'numbers' | 'changedAt' | 'project'
>;

/**
 * A course: its name, its own words as the description, its address as the canonical, its Markdown copy as an
 * alternate, and a preview with its picture, as page 21 draws it.
 */
export function learnCourseMetadata(course: MetadataCourse): Metadata {
  const path = courseHrefOf(course);
  return withPreview(
    pageMetadata({ title: course.name, description: courseDescriptionOf(course), path }),
    {
      title: learnShareTitleOf(course.name),
      description: courseShareDescriptionOf(course),
      page: path,
      picture: learnCourseCardUrlOf(course),
      alt: course.name,
    },
    courseMarkdownHrefOf(course),
  );
}

/**
 * All courses: the list's own address as the canonical, so a search's address (`?q=`) names the full list as the
 * page to index; a search's page itself is not indexed, and its links are still followed.
 */
export function learnCoursesMetadata(
  courses: readonly LearnCourseCard[],
  { searched }: { searched: boolean },
): Metadata {
  const metadata = withPreview(
    pageMetadata({ title: 'All courses', description: COURSES_DESCRIPTION, path: LEARN_COURSES_PATH }),
    {
      title: 'GitRanks Learn',
      description: LEARN_CARD_HEADLINE,
      page: LEARN_COURSES_PATH,
      picture: learnCoursesCardUrlOf(courses),
      alt: 'GitRanks Learn',
    },
    LEARN_COURSES_MARKDOWN_PATH,
  );
  return searched ? { ...metadata, robots: NO_INDEX_FOLLOW } : metadata;
}

/**
 * What a project course is about, for its structured data: the repository's code, or the organisation, at GitHub;
 * null for any other course.
 */
function projectAboutOf(course: Pick<LearnCourse, 'project'>): object | null {
  const { project } = course;
  if (!project) return null;
  return project.repo
    ? { '@type': 'SoftwareSourceCode', name: project.name, codeRepository: project.githubUrl }
    : { '@type': 'Organization', name: project.name, url: project.githubUrl };
}

/**
 * A course's structured data: a `Course` with its lessons as its parts (a paused lesson is left out: its address
 * answers that it is paused), what a project course is about, and its breadcrumbs (Learn, All courses, the course).
 */
export function learnCourseJsonLd(course: MetadataCourse & Pick<LearnCourse, 'groups'>): object[] {
  const url = absoluteUrl(courseHrefOf(course));
  const about = projectAboutOf(course);
  const crumbs = [
    { name: 'Learn', item: absoluteUrl(LEARN_HOME_PATH) },
    { name: 'All courses', item: absoluteUrl(LEARN_COURSES_PATH) },
    { name: course.name, item: url },
  ];
  const lessons = course.groups.flatMap((group) => group.lessons).filter((lesson) => !lesson.paused);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      '@id': `${url}#course`,
      url,
      name: course.name,
      description: courseDescriptionOf(course),
      inLanguage: 'en',
      isAccessibleForFree: true,
      dateModified: course.changedAt,
      image: absoluteUrl(learnCourseCardUrlOf(course)),
      provider: { '@id': ORGANIZATION_ID },
      ...(about ? { about } : {}),
      hasPart: lessons.map((lesson) => ({
        '@type': 'LearningResource',
        name: lesson.title,
        url: absoluteUrl(learnLessonPath(lesson.slug)),
        learningResourceType: 'Lesson',
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ];
}

/** All courses' structured data: an `ItemList` of the courses, in the list's order. */
export function learnCoursesJsonLd(courses: readonly Pick<LearnCourseCard, 'slug' | 'name' | 'project'>[]): object[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'All courses',
      url: absoluteUrl(LEARN_COURSES_PATH),
      numberOfItems: courses.length,
      itemListElement: courses.map((course, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: course.name,
        url: absoluteUrl(courseHrefOf(course)),
      })),
    },
  ];
}

/** The title of a paused or a removed course's page. */
export const COURSE_GONE_TITLE = { PAUSED: 'This course is paused', REMOVED: 'This course was removed' } as const;

/** A paused or removed course's page: its state as the title, never kept by search engines. */
export function learnCourseGoneMetadata(address: Pick<LearnAddress, 'state'> | null): Metadata {
  const title = address?.state === 'PAUSED' ? COURSE_GONE_TITLE.PAUSED : COURSE_GONE_TITLE.REMOVED;
  return { title, robots: NO_INDEX };
}

/** An address under Learn that leads nowhere. */
export const LEARN_MISSING_METADATA: Metadata = { title: 'Page not found', robots: NO_INDEX };
