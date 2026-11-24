import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

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
  courseCountLineOf,
  courseProgressLineOf,
  goodShareOf,
  type LearnCourse,
  type LearnCourseMine,
  learnersOf,
} from '@/lib/learn/course';
import { languageNameOf, languageNamesOf } from '@/lib/learn/learn-question';
import { checkPath, LEARN_COURSES_PATH, learnKnownPath } from '@/lib/learn/paths';
import { courseFixesCountOf, courseFixesPathOf } from '@/lib/learn/real-issues';

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
 * A course's head: the way back, its name, a line saying what kind of course it is with its public numbers (each only
 * when worth showing), what it is about, and a line of counts: the course's own, or the learner's figures in its place.
 */
export function CourseHeader({
  course,
  mine,
  language,
  onLanguage,
  fixesLinked = false,
}: {
  course: LearnCourse;
  mine: LearnCourseMine | null;
  language: string | null;
  onLanguage: (language: string) => void;
  /** "N real issues fixed" shows (from five), as a link to the course's merged fixes: while Learn's lists are open. */
  fixesLinked?: boolean;
}) {
  const learners = learnersOf(course.numbers);
  const good = goodShareOf(course.numbers);
  const fixed = fixesLinked ? courseFixesCountOf(course.numbers.issuesFixed) : null;
  const progress = mine ? courseProgressLineOf(mine, course) : null;
  // A language course has one language, or two that are one language with and without types ("JavaScript and
  // TypeScript"); each example is in one of them.
  const examplesIn = course.languages.length ? languageNamesOf(course.languages) : course.name;
  return (
    <header className="flex flex-col gap-2">
      <Link href={LEARN_COURSES_PATH} className="self-start text-sm font-semibold text-link hover:underline">
        ← All courses
      </Link>
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{course.name}</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground">
          {COURSE_KIND_LABELS[course.kind]}
        </span>
        {course.kind === 'TOPIC' ? (
          <>
            <span className="whitespace-nowrap">Works in any language</span>
            {course.languages.length > 1 ? (
              <LanguagePicker languages={course.languages} language={language} onPick={onLanguage} />
            ) : null}
          </>
        ) : (
          <span className="whitespace-nowrap">Examples in {examplesIn} only</span>
        )}
        {learners !== null || good !== null || fixed !== null ? (
          <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
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
            {good !== null ? (
              <span className="whitespace-nowrap">
                <span className="font-mono font-semibold text-foreground tabular-nums">{good}%</span> rate it good
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      <p className="m-0 max-w-[70ch] text-base text-muted-foreground">{course.about}</p>
      {/* One line in one place: the course's count, or the learner's figures and the door to the check. */}
      <p className="m-0 text-sm text-muted-foreground" data-course-line={progress ? 'mine' : 'course'}>
        {progress ? (
          <>
            <CountLine parts={progress.parts} />
            {progress.check ? (
              <>
                {progress.parts.length ? ' · ' : null}
                <Link
                  href={mine && mine.known > 0 ? learnKnownPath(course.slug) : checkPath(course.slug)}
                  className="font-medium text-link hover:underline"
                >
                  {progress.check}
                </Link>
              </>
            ) : null}
          </>
        ) : (
          courseCountLineOf(course)
        )}
      </p>
    </header>
  );
}
