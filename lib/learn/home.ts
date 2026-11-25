import {
  COURSE_KIND_LABELS,
  type CourseSection,
  countWords,
  courseSectionsOf,
  type LearnCourseCard,
  type LearnCourseKind,
  type LearnCourseMineCard,
  lessonsWords,
  reviewMinutesWords,
  toRepeatWords,
} from './course';
import { languageNameOf } from './learn-question';
import type { LearnLessonLink } from './lesson-page';
import { addLearnDays, learnTodayIn, shortDayWords } from './my-progress';
import { learnCourseProjectOf } from './project-course';
import { type LearnSetupRead, SETUP_LEVELS } from './setup';

/*
 * Learn home: the rules of what it shows, from the person's `learnHome` answer. Every field is read
 * tolerantly: an answer without a newer field shows that part empty, never fails the page.
 */

/** Why a course is suggested to a new learner, as the API keys it. */
export type LearnSuggestedReason = 'main-language' | 'most-start' | 'other-language';

/** A course suggested to a new learner, and why (null for a reason this page does not know). */
export type LearnSuggestedCourse = { course: LearnCourseCard; reason: LearnSuggestedReason | null };

/** The person's Learn home as the API answers it. */
export type LearnHomeRead = {
  highlight: 'REVIEW' | 'NEXT_LESSON' | null;
  next: LearnLessonLink | null;
  /** With no next lesson: the course to pick next, its slug and its name. */
  nextCourse: LearnLessonLink | null;
  due: number;
  repeatedToday: number;
  learnedToday: number;
  nextReviewAt: string | null;
  nextReviewLessons: number;
  courses: LearnCourseMineCard[];
  learned: number;
  practised: number;
  mastered: number;
  otherCourses: LearnCourseCard[];
  suggested: LearnSuggestedCourse[];
};

const KINDS: readonly LearnCourseKind[] = ['TOPIC', 'LANGUAGE', 'REPOSITORY', 'ORG'];
const REASONS: readonly LearnSuggestedReason[] = ['main-language', 'most-start', 'other-language'];

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const countOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const arrayOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A lesson's or a course's link: its slug and its title; null when either is missing. */
export function linkOf(value: unknown): LearnLessonLink | null {
  const raw = recordOf(value);
  const slug = textOf(raw?.slug);
  const title = textOf(raw?.title);
  return slug && title ? { slug, title } : null;
}

/** A course's card; null for one without a slug, a name or a kind this page draws, or a project course with no project. */
export function courseCardOf(value: unknown): LearnCourseCard | null {
  const raw = recordOf(value);
  const slug = textOf(raw?.slug);
  const name = textOf(raw?.name);
  const kind = raw?.kind as LearnCourseKind;
  if (!slug || !name || !KINDS.includes(kind)) return null;
  const project = learnCourseProjectOf(raw?.project);
  if ((kind === 'REPOSITORY' || kind === 'ORG') && !project) return null;
  const numbers = recordOf(raw?.numbers);
  const numberOf = (field: unknown) => (typeof field === 'number' && Number.isFinite(field) ? field : null);
  return {
    slug,
    name,
    kind,
    covers: textOf(raw?.covers) ?? '',
    languages: arrayOf(raw?.languages).filter((language): language is string => typeof language === 'string'),
    lessons: countOf(raw?.lessons),
    numbers: { learners: numberOf(numbers?.learners), goodShare: numberOf(numbers?.goodShare) },
    ...(project ? { project } : {}),
  };
}

function mineCardOf(value: unknown): LearnCourseMineCard | null {
  const raw = recordOf(value);
  const course = courseCardOf(raw?.course);
  if (!raw || !course) return null;
  return {
    course,
    learned: countOf(raw.learned),
    practised: countOf(raw.practised),
    mastered: countOf(raw.mastered),
    known: countOf(raw.known),
    due: countOf(raw.due),
    next: linkOf(raw.next),
    finishedAt: textOf(raw.finishedAt),
  };
}

function suggestedOf(value: unknown): LearnSuggestedCourse | null {
  const raw = recordOf(value);
  const course = courseCardOf(raw?.course);
  if (!course) return null;
  const reason = raw?.reason as LearnSuggestedReason;
  return { course, reason: REASONS.includes(reason) ? reason : null };
}

const listOf = <T>(value: unknown, read: (item: unknown) => T | null): T[] =>
  arrayOf(value)
    .map(read)
    .filter((item): item is T => item !== null);

/** The API's answer as the page reads it; null when there is none (Learn not open to the person, or no answer). */
export function learnHomeReadOf(value: unknown): LearnHomeRead | null {
  const raw = recordOf(value);
  if (!raw) return null;
  const highlight = raw.highlight === 'REVIEW' || raw.highlight === 'NEXT_LESSON' ? raw.highlight : null;
  return {
    highlight,
    next: linkOf(raw.next),
    nextCourse: linkOf(raw.nextCourse),
    due: countOf(raw.due),
    repeatedToday: countOf(raw.repeatedToday),
    learnedToday: countOf(raw.learnedToday),
    nextReviewAt: textOf(raw.nextReviewAt),
    nextReviewLessons: countOf(raw.nextReviewLessons),
    courses: listOf(raw.courses, mineCardOf),
    learned: countOf(raw.learned),
    practised: countOf(raw.practised),
    mastered: countOf(raw.mastered),
    otherCourses: listOf(raw.otherCourses, courseCardOf),
    suggested: listOf(raw.suggested, suggestedOf).slice(0, 3),
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Who gets which page at /learn                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * What `/learn` shows a signed-in person: Learn home with the Learn sign (Learn's onboarding saved), the landing without
 * it. When the sign cannot be read (null), the rule from before the sign: Learn home for someone who saved a setup or
 * learned a lesson, the landing for someone who did neither. Then neither a setup nor a home (an API that answers
 * neither for this person) is the landing; otherwise a setup that could not be read counts as set up, and a home that
 * could not be read shows Learn home's error: one failed read never sends a learner to the landing.
 */
export function learnPageOf({
  sign,
  setup,
  home,
}: {
  sign: boolean | null;
  setup: Pick<LearnSetupRead, 'state'> | null;
  home: Pick<LearnHomeRead, 'learned'> | null;
}): 'home' | 'landing' {
  if (sign !== null) return sign ? 'home' : 'landing';
  if (!setup && !home) return 'landing';
  if (!setup || setup.state === 'SAVED') return 'home';
  return home && home.learned <= 0 ? 'landing' : 'home';
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The two boxes                                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The first box: the next lesson, the next course, a first pick, or nothing left to start. */
export type HomeLessonBox =
  | { kind: 'next'; lesson: LearnLessonLink; course: string | null }
  | { kind: 'next-course'; course: LearnLessonLink; finished: string | null; lessons: number | null }
  | { kind: 'pick' }
  | { kind: 'all-done' };

/** The second box: lessons to repeat, or why there are none. */
export type HomeReviewBox =
  | { kind: 'due'; due: number; courses: number }
  | { kind: 'done-today'; repeated: number; next: string | null }
  | { kind: 'first'; days: number | null }
  | { kind: 'none-learned' }
  | { kind: 'nothing'; next: string | null };

/** The two boxes and which one is lit (it takes Enter): the review when lessons are due, else the next lesson. */
export type HomeBoxes = { lesson: HomeLessonBox; review: HomeReviewBox; highlight: 'lesson' | 'review' | null };

/** The course most recently finished, by its day. */
function lastFinishedOf(courses: readonly LearnCourseMineCard[]): string | null {
  const finished = courses
    .filter((mine) => mine.finishedAt)
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''));
  return finished[0]?.course.name ?? null;
}

/** The first box, from what the person has started. */
export function lessonBoxOf(home: LearnHomeRead): HomeLessonBox {
  if (home.next) {
    const slug = home.next.slug;
    const course = home.courses.find((mine) => mine.next?.slug === slug)?.course.name ?? null;
    return { kind: 'next', lesson: home.next, course };
  }
  if (!home.courses.length) return { kind: 'pick' };
  if (home.nextCourse) {
    const slug = home.nextCourse.slug;
    const card = home.otherCourses.find((course) => course.slug === slug);
    return {
      kind: 'next-course',
      course: home.nextCourse,
      finished: lastFinishedOf(home.courses),
      lessons: card ? card.lessons : null,
    };
  }
  const everyFinished = home.courses.every((mine) => mine.finishedAt);
  return everyFinished && !home.otherCourses.length ? { kind: 'all-done' } : { kind: 'pick' };
}

/** Whole days from today to a moment, in the zone the person's days are counted in; null for no moment. */
export function daysUntil(at: string | null, now: Date, timeZone: string | null): number | null {
  const when = at ? new Date(at) : null;
  if (!when || Number.isNaN(when.getTime())) return null;
  const today = learnTodayIn(now, timeZone);
  const day = learnTodayIn(when, timeZone);
  let days = 0;
  if (day <= today) return 0;
  // A review is at most a few months away: counted a day at a time, with a stop.
  for (let each = today; each < day && days < 400; each = addLearnDays(each, 1)) days += 1;
  return days;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "today", "tomorrow", "on Monday" within a week, else "on 2 Dec". */
export function dayWordsOf(at: string, now: Date, timeZone: string | null): string | null {
  const days = daysUntil(at, now, timeZone);
  if (days === null) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  const today = learnTodayIn(now, timeZone);
  const day = addLearnDays(today, days);
  if (days < 7) return `on ${WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()]}`;
  return `on ${shortDayWords(day, today)}`;
}

/** "Next: 3 lessons on Monday."; null when nothing is planned. */
export function nextReviewWordsOf(
  home: Pick<LearnHomeRead, 'nextReviewAt' | 'nextReviewLessons'>,
  now: Date,
  timeZone: string | null,
): string | null {
  if (!home.nextReviewAt || home.nextReviewLessons <= 0) return null;
  const when = dayWordsOf(home.nextReviewAt, now, timeZone);
  if (!when) return null;
  const lessons = `${countWords(home.nextReviewLessons)} ${home.nextReviewLessons === 1 ? 'lesson' : 'lessons'}`;
  return `Next: ${lessons} ${when}.`;
}

/** The second box: lessons due, done for today, the first review ahead, nothing learned yet, or nothing today. */
export function reviewBoxOf(home: LearnHomeRead, now: Date, timeZone: string | null): HomeReviewBox {
  if (home.due > 0) {
    return { kind: 'due', due: home.due, courses: home.courses.filter((mine) => mine.due > 0).length };
  }
  const next = nextReviewWordsOf(home, now, timeZone);
  if (home.repeatedToday > 0) return { kind: 'done-today', repeated: home.repeatedToday, next };
  if (home.learned <= 0) return { kind: 'none-learned' };
  // Nothing has come back yet: every lesson is still at its first depth.
  if (home.practised <= 0 && home.mastered <= 0) {
    return { kind: 'first', days: daysUntil(home.nextReviewAt, now, timeZone) };
  }
  return { kind: 'nothing', next };
}

/** The two boxes; the API's highlight when it names one that has something to press, else the same rule here. */
export function homeBoxesOf(home: LearnHomeRead, now: Date, timeZone: string | null): HomeBoxes {
  const lesson = lessonBoxOf(home);
  const review = reviewBoxOf(home, now, timeZone);
  const reviewActs = review.kind === 'due';
  const lessonActs = lesson.kind === 'next';
  let highlight: HomeBoxes['highlight'] = reviewActs ? 'review' : lessonActs ? 'lesson' : null;
  if (home.highlight === 'REVIEW' && reviewActs) highlight = 'review';
  else if (home.highlight === 'NEXT_LESSON' && lessonActs) highlight = 'lesson';
  return { lesson, review, highlight };
}

/** The review box's line under its title, when lessons are due: how long, from how many courses. */
export function dueLineOf(box: Extract<HomeReviewBox, { kind: 'due' }>): string {
  const minutes = reviewMinutesWords(box.due).replace(/\.$/, '');
  const from = box.courses > 1 ? `, from ${countWords(box.courses)} courses` : '';
  return `${minutes}${from}. Getting one right again moves it from Learned to Practised.`;
}

/** "6 lessons to repeat". */
export const dueTitleOf = (due: number) => toRepeatWords(due);

/** "Your first review is in 3 days", "…is tomorrow", "…is today"; without a day when none is planned. */
export function firstReviewTitleOf(days: number | null): string {
  if (days === null) return 'Your first review comes soon';
  if (days === 0) return 'Your first review is today';
  if (days === 1) return 'Your first review is tomorrow';
  return `Your first review is in ${countWords(days)} days`;
}

/** "You finished X. Y is a good next step: 64 lessons." */
export function nextCourseLineOf(box: Extract<HomeLessonBox, { kind: 'next-course' }>): string {
  const finished = box.finished ? `You finished ${box.finished}. ` : '';
  const lessons = box.lessons ? `: ${lessonsWords(box.lessons)}` : '';
  return `${finished}${box.course.title} is a good next step${lessons}.`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Your courses, other courses, a first course                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

/** "13 lessons learned · 4 practised · 1 mastered", each part only when it is more than none; null with none learned. */
export function totalsLineOf(home: Pick<LearnHomeRead, 'learned' | 'practised' | 'mastered'>): string | null {
  if (home.learned <= 0) return null;
  return [
    `${countWords(home.learned)} ${home.learned === 1 ? 'lesson' : 'lessons'} learned`,
    home.practised > 0 ? `${countWords(home.practised)} practised` : null,
    home.mastered > 0 ? `${countWords(home.mastered)} mastered` : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}

/** Other courses: only courses not started, by kind; a kind with none is left out. */
export const otherSectionsOf = (home: Pick<LearnHomeRead, 'otherCourses'>): CourseSection[] =>
  courseSectionsOf(home.otherCourses);

/** A new learner: no course started and nothing learned; the page asks them to pick a first course. */
export const isNewLearner = (home: Pick<LearnHomeRead, 'courses' | 'learned'>) =>
  !home.courses.length && home.learned <= 0;

/** The words over a suggested course. */
export const SUGGESTED_REASON_WORDS: Record<LearnSuggestedReason, string> = {
  'main-language': 'Your main language',
  'most-start': 'Where most people start',
  'other-language': 'Another language you use',
};

/** A suggested course's kind pill. */
export const kindLabelOf = (course: Pick<LearnCourseCard, 'kind'>) => COURSE_KIND_LABELS[course.kind];

/** "Go and Python", "Go, Python and Rust". */
function listWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "Suggested for Go and Python, experienced developer"; null when the setup names no language. */
export function suggestedForOf(
  setup: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'> | null,
): string | null {
  if (!setup?.mainLanguage) return null;
  const languages = [setup.mainLanguage, ...setup.otherLanguages.filter((language) => language !== setup.mainLanguage)];
  const level = SETUP_LEVELS.find((each) => each.level === setup.level)?.label.toLowerCase();
  return `Suggested for ${listWords(languages.slice(0, 3).map(languageNameOf))}${level ? `, ${level}` : ''}`;
}
