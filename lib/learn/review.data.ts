import 'server-only';

import { plainCodeOf } from './code-tokens';
import { highlightCodes } from './highlight';
import { isLanguageKey } from './lesson-answer-input';
import { isContentSlug } from './paths';
import type { ReviewNext, ReviewSide } from './review';
import {
  LearnCourseNextDocument,
  LearnHomeNextDocument,
  LearnReviewDocument,
  LearnSetupMainLanguageDocument,
} from './review.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The signed-in person's review, read for them alone and never kept: today's set with each question's code highlighted
 * here (the page has no server render of its own), and where to go once it is done.
 */

/** Where to go once the review is done: the course's next lesson, or Learn home's next lesson or course. None on failure. */
async function nextOf(githubLogin: string, course: string | null): Promise<ReviewNext | null> {
  try {
    if (course) {
      const { learnCourseMine } = await graphqlDirect(
        LearnCourseNextDocument,
        { slug: course },
        { source: 'ssr', githubLogin },
      );
      return learnCourseMine?.next ? { kind: 'lesson', link: learnCourseMine.next } : null;
    }
    const { learnHome } = await graphqlDirect(LearnHomeNextDocument, {}, { source: 'ssr', githubLogin });
    if (learnHome?.next) return { kind: 'lesson', link: learnHome.next };
    return learnHome?.nextCourse ? { kind: 'course', link: learnHome.nextCourse } : null;
  } catch {
    return null;
  }
}

/** The main language of the person's setup: the first the review asks code in. None when there is none, or on failure. */
async function mainLanguageOf(githubLogin: string): Promise<string | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(
      LearnSetupMainLanguageDocument,
      {},
      { source: 'ssr', githubLogin },
    );
    const main = learnSetupOfMine?.mainLanguage;
    return isLanguageKey(main) ? main : null;
  } catch {
    return null;
  }
}

/**
 * Today's review of one course or of every course: null when Learn is not open to the person, and on any failure.
 * A course of another shape is read as every course.
 */
export async function loadLearnReviewSide(githubLogin: string, course: string | null): Promise<ReviewSide | null> {
  const scope = course && isContentSlug(course) ? course : null;
  const [review, next, mainLanguage] = await Promise.all([
    graphqlDirect(LearnReviewDocument, { course: scope }, { source: 'ssr', githubLogin }).then(
      ({ learnReview }) => learnReview,
      () => null,
    ),
    nextOf(githubLogin, scope),
    mainLanguageOf(githubLogin),
  ]);
  if (!review) return null;
  const items = await Promise.all(
    review.items.map(async (item) => ({
      ...item,
      highlighted: await highlightCodes(item.question.codes).catch(() => item.question.codes.map(plainCodeOf)),
    })),
  );
  return {
    items,
    more: review.more,
    nextReviewAt: review.nextReviewAt,
    nextReviewLessons: review.nextReviewLessons,
    next,
    mainLanguage,
  };
}
