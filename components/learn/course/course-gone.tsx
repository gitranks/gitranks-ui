import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { LessonGoneText } from '@/lib/learn/lesson-gone';
import { LEARN_COURSES_PATH } from '@/lib/learn/paths';

/**
 * The page of a course that is paused or removed, or of an address under Learn that leads nowhere: what the
 * address was, a title, one sentence, and the way to all courses, which never leads to an empty page.
 */
export function CourseGoneView({ text, state }: { text: LessonGoneText; state: 'paused' | 'removed' | 'missing' }) {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 pt-16 pb-24"
      data-course-gone={state}
    >
      <p className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{text.eyebrow}</p>
      <h1 className="m-0 text-3xl font-bold tracking-tight">{text.title}</h1>
      <p className="m-0 text-lg text-muted-foreground">{text.lead}</p>
      <Button asChild variant="outline" className="h-9 px-4 max-sm:min-h-11">
        <Link href={LEARN_COURSES_PATH}>See all courses</Link>
      </Button>
    </main>
  );
}
