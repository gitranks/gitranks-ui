import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProjectAuthor, ProjectFacts } from './project-course-parts';
import { CourseBuildDoor } from '@/components/build/doors-gate';
import { CoursePlansLine, CourseTitleLogo } from '@/components/interviews/learn-gate/course-gate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  COURSE_KIND_LABELS,
  type CountPart,
  courseLessonsFactOf,
  courseProgressLineOf,
  type LearnCourse,
  type LearnCourseMine,
  learnersOf,
} from '@/lib/learn/course';
import {
  type CourseInterviews,
  companyCourseLessonsFactOf,
  companyCourseNoticeOf,
} from '@/lib/learn/course-interviews';
import { checkPath, LEARN_COURSES_PATH, learnKnownPath } from '@/lib/learn/paths';
import { courseFixesCountOf, courseFixesPathOf } from '@/lib/learn/real-issues';
import { languageNameOf, languageNamesOf } from '@/lib/workspace/learn-question';

/** A number in the pages' mono face. */
export function Figure({ count }: { count: number }) {
  return <span className="font-mono font-semibold text-foreground tabular-nums">{count.toLocaleString('en-US')}</span>;
}

/** A line of counts: each number in the mono face, the parts joined by " · ". */
export function CountLine({ parts }: { parts: CountPart[] }) {
  return parts.map((part, index) => (
    // A line's parts never move: the index is the part.
    <span key={index}>
      {index > 0 ? ' · ' : null}
      {part.count !== null ? <Figure count={part.count} /> : null}
      {part.words}
    </span>
  ));
}

/** "Examples in [Python ▾]": the language every lesson of a topic course shows its example in, kept in the browser. */
function LanguagePicker({
  languages,
  language,
  onPick,
}: {
  languages: readonly string[];
  language: string | null;
  onPick: (language: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      Examples in
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
          aria-label={`Examples in ${language ? languageNameOf(language) : ''}. Change the language`}
        >
          {language ? languageNameOf(language) : null}
          <ChevronDown className="size-[15px]" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={language ?? undefined} onValueChange={onPick}>
            {languages.map((code) => (
              <DropdownMenuRadioItem key={code} value={code}>
                {languageNameOf(code)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/**
 * The right end of a course's row of facts: the language of its examples. A topic course offers the choice when it
 * has more than one; a language course names its own. A project course has none here: its line names its project. A
 * company's course has no code, so no language.
 */
function examplesLanguageOf(
  course: LearnCourse,
  language: string | null,
  onLanguage: (language: string) => void,
): ReactNode {
  if (course.project || course.kind === 'COMPANY') return null;
  if (course.kind === 'TOPIC') {
    const [only] = course.languages;
    if (course.languages.length > 1) {
      return <LanguagePicker languages={course.languages} language={language} onPick={onLanguage} />;
    }
    return only ? <span className="whitespace-nowrap">Examples in {languageNameOf(only)}</span> : null;
  }
  // A language course has one language, or two that are one language with and without types ("JavaScript and
  // TypeScript"); each example is in one of them.
  const examplesIn = course.languages.length ? languageNamesOf(course.languages) : course.name;
  return <span className="whitespace-nowrap">Examples in {examplesIn} only</span>;
}

/**
 * The learner's figures over the lessons: learned, practised, mastered, and the door to the check (the lessons marked
 * as known, or the offer to mark some). Nothing while they have none. It stands with the lessons' filters, which a
 * learner's side brings too, so the head above never changes when the side arrives.
 */
export function CourseProgressLine({ course, mine }: { course: LearnCourse; mine: LearnCourseMine | null }) {
  const progress = mine ? courseProgressLineOf(mine, course) : null;
  if (!mine || !progress) return null;
  return (
    <p className="m-0 text-sm text-muted-foreground" data-course-line="mine">
      <CountLine parts={progress.parts} />
      {progress.check ? (
        <>
          {progress.parts.length ? ' · ' : null}
          <Link
            href={mine.known > 0 ? learnKnownPath(course.slug) : checkPath(course.slug)}
            className="font-medium text-link hover:underline"
          >
            {progress.check}
          </Link>
        </>
      ) : null}
    </p>
  );
}

/**
 * A course's head, short and the same for everyone, so nothing under it moves when a learner's side arrives: the way
 * back, its name, what it is about (for a project course, who wrote it), and one row of facts: the kind, the lessons
 * and groups, the learners and the real issues fixed (each only when worth showing), a project course's links, and
 * the language of the examples at its right end. How the course is rated is on its card in the list, not here.
 */
export function CourseHeader({
  course,
  language,
  onLanguage,
  projectIssues = null,
  interviews = null,
}: {
  course: LearnCourse;
  language: string | null;
  onLanguage: (language: string) => void;
  /** A project course's open issues to fix: its line of facts links them, while there are some. */
  projectIssues?: number | null;
  /**
   * What Interviews shows on the course, for a person it is open to: the line of the companies whose plans use it, or
   * for a company's own course its logo, its notice and its lessons by round.
   */
  interviews?: CourseInterviews | null;
}) {
  const learners = learnersOf(course.numbers);
  // "N real issues fixed" shows from five, as a link to the course's merged fixes.
  const fixed = courseFixesCountOf(course.numbers.issuesFixed);
  const examples = examplesLanguageOf(course, language, onLanguage);
  const own = interviews?.own ?? null;
  return (
    <header className="flex flex-col gap-2">
      <Link href={LEARN_COURSES_PATH} className="self-start text-sm font-semibold text-link hover:underline">
        ← All courses
      </Link>
      {own ? (
        <h1 className="m-0 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          <CourseTitleLogo company={own.company} />
          {course.name}
        </h1>
      ) : (
        <h1 className="m-0 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{course.name}</h1>
      )}
      <p className="m-0 max-w-[70ch] text-base text-muted-foreground">
        {own ? `${course.about} ${companyCourseNoticeOf(own)}` : course.about}
      </p>
      {course.project ? <ProjectAuthor project={course.project} /> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground" data-course-facts="">
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground">
          {COURSE_KIND_LABELS[course.kind]}
        </span>
        <span className="whitespace-nowrap" data-course-lessons="">
          {own ? companyCourseLessonsFactOf(course) : courseLessonsFactOf(course)}
        </span>
        {learners !== null ? (
          <span className="whitespace-nowrap">
            <Figure count={learners} /> learners
          </span>
        ) : null}
        {fixed !== null ? (
          <Link
            href={courseFixesPathOf(course.slug)}
            prefetch={false}
            className="whitespace-nowrap text-link hover:underline"
            data-course-fixed=""
          >
            <Figure count={fixed} /> real issues fixed
          </Link>
        ) : null}
        {course.project ? (
          <ProjectFacts project={course.project} slug={course.slug} openIssues={projectIssues} />
        ) : null}
        {examples ? (
          <span className="ml-auto" data-course-examples="">
            {examples}
          </span>
        ) : null}
      </div>
      {/* The companies whose interview plans use the course; a company's own course names its company above. */}
      {interviews && !own ? <CoursePlansLine companies={interviews.companies} /> : null}
      {/* Build's door, under the row of facts: only for a signed-in person, once their browser read it. */}
      <CourseBuildDoor course={course.slug} />
    </header>
  );
}
