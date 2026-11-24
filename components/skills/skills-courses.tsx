import { FixStar, SkillsCourseCard } from './skills-course-card';
import { CourseMark } from '@/components/learn/course/course-marks';
import type { SkillsCourse } from '@/lib/skills/skills.types';
import { DEPTH_WORDS, hasStar, STAR_WORDS, squareOf } from '@/lib/skills/skills-courses';

/** What Learned, Practised and Mastered mean, and the star while a lesson has one. */
export function SkillsLegend({ star }: { star: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground" data-skills-legend="">
      {(['LEARNED', 'PRACTISED', 'MASTERED'] as const).map((depth) => (
        <span key={depth} className="inline-flex items-center gap-2">
          <CourseMark square={squareOf({ depth })} />
          {DEPTH_WORDS[depth]}
        </span>
      ))}
      {star ? (
        <span className="inline-flex items-center gap-2">
          <FixStar className="size-4" />
          {STAR_WORDS}
        </span>
      ) : null}
    </div>
  );
}

/**
 * "Courses": the legend, one card for each course the person learned a lesson in, and how the squares work (pointed
 * at on a computer, tapped on a phone). Nothing without a course.
 */
export function SkillsCoursesSection({ courses, now }: { courses: readonly SkillsCourse[]; now: Date }) {
  if (!courses.length) return null;
  return (
    <section aria-labelledby="skills-courses" className="flex flex-col gap-3" data-skills-courses="">
      <h3 id="skills-courses" className="m-0 text-xl font-bold tracking-tight">
        Courses
      </h3>
      <SkillsLegend star={hasStar(courses)} />
      {courses.map((course) => (
        <SkillsCourseCard key={course.course.slug} course={course} now={now} />
      ))}
      <p className="m-0 text-xs text-muted-foreground max-sm:hidden">
        One square is one lesson, in order. Point at a square to see the lesson, or click it to open it.
      </p>
      <p className="m-0 text-xs text-muted-foreground sm:hidden">Tap a square to open its lesson.</p>
    </section>
  );
}
