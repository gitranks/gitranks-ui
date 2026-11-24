import { Star } from 'lucide-react';
import Link from 'next/link';

import { CourseMark } from '@/components/learn/course/course-marks';
import { LEVEL_WORDS } from '@/lib/learn/course';
import { coursePath, learnLessonPath } from '@/lib/learn/paths';
import type { SkillsCourse, SkillsGroup, SkillsLesson } from '@/lib/skills/skills.types';
import {
  COURSE_KIND_WORDS,
  courseCountsOf,
  DEPTH_WORDS,
  finishedWordsOf,
  groupCountOf,
  notStartedLineOf,
  STAR_WORDS,
  squareLabelOf,
  squareOf,
} from '@/lib/skills/skills-courses';

/** The star on a square a merged fix used: drawn over the square, so it never changes the square's size. */
export function FixStar({ className = 'absolute -top-1 -right-1 size-3' }: { className?: string }) {
  return (
    <Star aria-hidden="true" data-star="" className={`${className} fill-amber-400 stroke-amber-600 stroke-[1.5]`} />
  );
}

/** One square: a link to its lesson, with the small card that pointing at it or reaching it with the keyboard shows. */
function Square({ group, lesson }: { group: string; lesson: SkillsLesson }) {
  const square = squareOf(lesson);
  return (
    <Link
      href={learnLessonPath(lesson.slug)}
      prefetch={false}
      aria-label={squareLabelOf(lesson)}
      data-lesson={lesson.slug}
      className="group/square relative inline-flex rounded-[4px] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <CourseMark square={square} size={22} />
      {lesson.fix ? <FixStar /> : null}
      <span
        role="tooltip"
        data-square-card=""
        className="absolute top-[30px] -left-2 z-[2] hidden w-[280px] flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm group-hover/square:flex group-focus-visible/square:flex"
      >
        <span className="text-xs text-muted-foreground">
          {group} · {LEVEL_WORDS[lesson.level]}
        </span>
        <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
        <span className="flex items-center gap-2 text-xs text-foreground">
          <CourseMark square={square} />
          {DEPTH_WORDS[lesson.depth]}
        </span>
        {lesson.fix ? (
          <span className="flex items-center gap-2 text-xs text-foreground">
            <FixStar className="size-4" />
            {STAR_WORDS}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">Click to open the lesson</span>
      </span>
    </Link>
  );
}

/** A group the person started: its name, "7 of 12", and one square for each lesson, in order. The squares wrap. */
function Group({ group }: { group: SkillsGroup }) {
  return (
    <li className="flex min-w-0 flex-col gap-2" data-group={group.slug}>
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{group.name}</span>
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {groupCountOf(group)}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        {group.lessons.map((lesson) => (
          <Square key={lesson.slug} group={group.name} lesson={lesson} />
        ))}
      </span>
    </li>
  );
}

/**
 * One course on a Skills page: its name as a link, "Finished on 12 Nov" when every lesson is learned, its kind and its
 * counts, the groups started with their squares (read-only: the course page's squares, darker for deeper, a star on a
 * lesson a merged fix used), and the groups not started in one line.
 */
export function SkillsCourseCard({ course, now }: { course: SkillsCourse; now: Date }) {
  const finished = finishedWordsOf(course, now);
  const notStarted = notStartedLineOf(course.notStarted);
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-5" data-skills-course={course.course.slug}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="m-0 text-base font-semibold">
            <Link href={coursePath(course.course.slug)} prefetch={false} className="hover:underline">
              {course.course.name}
            </Link>
          </h4>
          {finished ? (
            <span className="rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-positive">
              {finished}
            </span>
          ) : null}
        </div>
        <span className="text-sm text-muted-foreground">
          {COURSE_KIND_WORDS[course.course.kind]} · {courseCountsOf(course)}
        </span>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-4 p-0 sm:grid-cols-2">
        {course.groups.map((group) => (
          <Group key={group.slug} group={group} />
        ))}
      </ul>
      {notStarted ? <p className="m-0 border-t pt-3 text-sm text-muted-foreground">{notStarted}</p> : null}
    </article>
  );
}
