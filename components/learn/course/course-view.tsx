'use client';

import Link from 'next/link';
import { Fragment, useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { type CourseBoxCalls, CourseBoxesRow } from './course-boxes';
import { CourseHeader } from './course-header';
import { type CourseLessonsView, CourseList, CourseSquares, CourseToolbar } from './course-lessons';
import { CourseLegend } from './course-marks';
import { ProjectFoot } from './project-course-parts';
import { useCoursePageKeys } from './use-course-keys';
import {
  type CourseFilter,
  type CoursePerson,
  courseBoxesOf,
  courseSearchOf,
  courseSquareOf,
  filterCountsOf,
  type LearnCourse,
  type LearnCourseCard,
  type LearnCourseMine,
  lessonsWords,
  mineBySlugOf,
  passesFilter,
  searchQueryOf,
} from '@/lib/learn/course';
import type { LearnGroupLesson } from '@/lib/learn/lesson-page';
import { courseHrefOf, courseMarkdownHrefOf, courseProjectOf, learnProjectIssuesPath } from '@/lib/learn/paths';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** The view a learner last picked, kept in this browser for every course. */
export const COURSE_VIEW_KEY = 'gitranks:learn:course-view:v1';

const viewListeners = new Set<() => void>();

function readView(): CourseLessonsView {
  try {
    return window.localStorage.getItem(COURSE_VIEW_KEY) === 'squares' ? 'squares' : 'list';
  } catch {
    return 'list';
  }
}

function subscribeView(listener: () => void) {
  viewListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    viewListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function pickView(view: CourseLessonsView) {
  try {
    window.localStorage.setItem(COURSE_VIEW_KEY, view);
  } catch {
    // A browser that keeps nothing still switches for this page.
  }
  for (const listener of viewListeners) listener();
}

/** Everything a course's page draws from: plain data and the page's calls. */
export type CourseViewProps = {
  course: LearnCourse;
  /** The signed-in person's side; null for a visitor. */
  mine: LearnCourseMine | null;
  /** The other courses, named in the footer. */
  others: readonly LearnCourseCard[];
  calls: CourseBoxCalls;
  /** Who looks at the course while `mine` is null: a visitor (the default), or a session whose side is pending or did not come. */
  person?: CoursePerson;
  /** The check takes the highlight and Enter: a course not started, for an experienced developer. */
  checkFirst?: boolean;
  /** The learner's main language, once their side brings it: the examples open in it when the course has it. */
  mainLanguage?: string | null;
  /** The open issues of the learner's list for lessons of the course: the third box, while there are some. */
  openIssues?: number | null;
  /** A project course's open issues to fix, the same for everyone: linked in its line of facts, while there are some. */
  projectIssues?: number | null;
  /** For the catalogue: a state drawn as it stands. */
  drawn?: { view?: CourseLessonsView; filter?: CourseFilter; query?: string; openCard?: string };
  hints?: boolean;
};

/**
 * A course's page under the site's header: its head, the three boxes, the bar over the lessons, the lessons
 * as a list by group or as squares, and the footer. A visitor sees the course; a learner sees it marked with their own
 * side, filters it, and may switch to the Squares view (never on a phone).
 */
export function CourseView({
  course,
  mine,
  others,
  calls,
  person = 'visitor',
  checkFirst = false,
  mainLanguage = null,
  openIssues = null,
  projectIssues = null,
  drawn = {},
  hints: hintsGiven,
}: CourseViewProps) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const learner = mine !== null;
  const stored = useSyncExternalStore(subscribeView, readView, () => 'list' as const);
  const [picked, setPicked] = useState<CourseLessonsView | null>(drawn.view ?? null);
  const view = learner ? (picked ?? stored) : 'list';
  const [filter, setFilter] = useState<CourseFilter>(drawn.filter ?? 'all');
  const [query, setQuery] = useState(drawn.query ?? '');
  const [language, pickLanguage] = useExampleLanguage(course.languages, mainLanguage);
  const inputRef = useRef<HTMLInputElement>(null);
  const clear = useCallback(() => setQuery(''), []);
  useCoursePageKeys({ inputRef, onClear: clear });

  const own = useMemo(() => mineBySlugOf(mine), [mine]);
  const next = mine?.next?.slug ?? null;
  const squareOf = useCallback(
    (lesson: LearnGroupLesson) => courseSquareOf(lesson, own.get(lesson.slug), next),
    [own, next],
  );
  const q = searchQueryOf(query);
  const found = useMemo(() => courseSearchOf(course.groups, q), [course.groups, q]);
  const foundLessons = useMemo(() => found.flatMap((group) => group.lessons), [found]);
  const counts = filterCountsOf(foundLessons, squareOf);
  const foundSlugs = useMemo(() => new Set(foundLessons.map((lesson) => lesson.slug)), [foundLessons]);
  const visible = (lesson: LearnGroupLesson) => foundSlugs.has(lesson.slug) && passesFilter(squareOf(lesson), filter);
  const boxes = courseBoxesOf(course, mine, { checkFirst, person, openIssues });
  // "Fix a real issue" on a project course leads to the Issues of its project.
  const project = courseProjectOf(course);
  const issuesHref = project ? learnProjectIssuesPath(project) : undefined;
  const shownCount = foundLessons.filter((lesson) => passesFilter(squareOf(lesson), filter)).length;
  const nothing = shownCount === 0;
  // What the search and the filter leave, said to a screen reader as it changes; nothing while the whole course shows.
  const status = q || filter !== 'all' ? (nothing ? 'No lesson found.' : `${lessonsWords(shownCount)} shown.`) : '';

  // With nothing to show, the same words and the way back on every width, in the list and in the Squares view.
  const nothingBox = nothing ? (
    <p className="m-0 rounded-xl border bg-card p-5 text-sm text-muted-foreground" data-course-nothing="">
      {q ? <>No lesson of this course matches “{q}”. </> : <>No lesson here for this filter. </>}
      <button
        type="button"
        className="font-medium text-link hover:underline"
        onClick={() => {
          setQuery('');
          setFilter('all');
          // The button goes with the nothing it explains: the search field takes the focus, where a new search starts.
          inputRef.current?.focus();
        }}
      >
        Show all lessons
      </button>
    </p>
  ) : null;
  const list = nothing ? null : (
    <CourseList found={found} squareOf={squareOf} mine={own} learner={learner} query={q} filter={filter} />
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16" data-course={course.slug}>
      <CourseHeader
        course={course}
        mine={mine}
        language={language}
        onLanguage={pickLanguage}
        projectIssues={projectIssues}
      />
      <CourseBoxesRow boxes={boxes} slug={course.slug} hints={hints} calls={calls} issuesHref={issuesHref} />
      <div className="flex flex-col gap-3">
        <CourseToolbar
          learner={learner}
          filter={filter}
          counts={counts}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          view={view}
          onView={(chosen) => {
            setPicked(chosen);
            pickView(chosen);
          }}
          hints={hints}
          inputRef={inputRef}
        />
        {learner ? <CourseLegend /> : null}
        <p className="sr-only" role="status" data-course-status="">
          {status}
        </p>
      </div>
      {nothingBox}
      {view === 'squares' ? (
        <>
          {/* A phone has the list only. */}
          {list ? <div className="sm:hidden">{list}</div> : null}
          <div className="max-sm:hidden">
            <CourseSquares
              groups={course.groups}
              squareOf={squareOf}
              mine={own}
              visible={visible}
              openCard={drawn.openCard ?? null}
            />
          </div>
        </>
      ) : (
        list
      )}
      {course.project ? (
        <ProjectFoot project={course.project} markdown={courseMarkdownHrefOf(course)} />
      ) : (
        <CourseFooter course={course} others={others} />
      )}
    </main>
  );
}

/** Who wrote the course, its Markdown copy, and the other courses. */
function CourseFooter({ course, others }: { course: LearnCourseCard; others: readonly LearnCourseCard[] }) {
  const rest = others.filter((other) => other.slug !== course.slug);
  return (
    <p className="m-0 text-xs text-muted-foreground">
      Written and checked by GitRanks ·{' '}
      <a href={courseMarkdownHrefOf(course)} className="hover:underline">
        Markdown version
      </a>
      {rest.length ? (
        <>
          {' · Other courses: '}
          {rest.map((other, index) => (
            <Fragment key={other.slug}>
              {index > 0 ? ', ' : null}
              <Link href={courseHrefOf(other)} className="hover:underline">
                {other.name}
              </Link>
            </Fragment>
          ))}
        </>
      ) : null}
    </p>
  );
}
