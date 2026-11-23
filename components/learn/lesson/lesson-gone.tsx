import Link from 'next/link';
import type { ReactNode } from 'react';

import { DEPTH_SQUARE_CLASS } from './lesson-strip-end';
import { Button } from '@/components/ui/button';
import type { LessonGoneState, LessonGoneText } from '@/lib/learn/lesson-gone';
import { coursePath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/** The learner's line in its box: on a paused lesson after the square of a learned lesson; on a removed one alone. */
export function LessonGoneLearnerBox({ state, line }: { state: LessonGoneState; line: string }) {
  return (
    <p className="m-0 flex items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm" data-lesson-gone-learner="">
      {state === 'PAUSED' && (
        <span
          aria-hidden="true"
          className={cn('mt-0.5 inline-block size-4 shrink-0 rounded-[4px]', DEPTH_SQUARE_CLASS.learned)}
        />
      )}
      <span>{line}</span>
    </p>
  );
}

/**
 * The page of a paused or a removed lesson: what the address was, its state as the title, one sentence, the learner's
 * line when there is one (`learner`), and the way to the course when its course is known.
 */
export function LessonGoneView({
  state,
  text,
  course,
  learner,
}: {
  state: LessonGoneState;
  text: LessonGoneText;
  course: { slug: string; title: string } | null;
  learner?: ReactNode;
}) {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 pt-16 pb-24"
      data-lesson-gone={state.toLowerCase()}
    >
      <p className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{text.eyebrow}</p>
      <h1 className="m-0 text-3xl font-bold tracking-tight">{text.title}</h1>
      <p className="m-0 text-lg text-muted-foreground">{text.lead}</p>
      {learner}
      {course && (
        <Button asChild variant="outline" className="h-9 max-w-full px-4 max-sm:min-h-11">
          <Link href={coursePath(course.slug)}>
            <span className="truncate">Open the course</span>
          </Link>
        </Button>
      )}
    </main>
  );
}
