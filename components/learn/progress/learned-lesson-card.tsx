import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { stepAnchorOf } from '../lesson-steps';
import { Pill } from '@/components/pill/pill';
import { RefChips } from '@/components/workspace/ref-chips';
import { LESSON_KINDS, passedLineOf } from '@/lib/learn/progress/progress';
import type { LearnedStep, LearnProgressLessonKind } from '@/lib/learn/progress/progress.types';
import { partsLabelOf } from '@/lib/learn/question';

/** What the card draws of a lesson: wherever it is listed, the viewer's own page or a public one. */
export type LearnedLesson = {
  kind: LearnProgressLessonKind;
  title: string;
  repo: string | null;
  issueNumber: number | null;
  /** The lesson's pull request, when one exists and may be shown. */
  pr: { number: number; url: string | null } | null;
  passedAt: string;
  learned: LearnedStep[];
};

/**
 * A lesson and the new things it taught: the reference line, the title (to the lesson, `href`), when it was passed,
 * and one tile per new thing ("2 · Cause", then the step's title), each to its step of the lesson. One column of
 * tiles on a phone. `pills`: what follows the reference chips, the lesson's kind by default (a public page says only
 * `Practice` and `Merged`).
 */
export function LearnedLessonCard({
  lesson,
  href,
  pills,
}: {
  lesson: LearnedLesson;
  href: Route | null;
  pills?: ReactNode;
}) {
  const kind = LESSON_KINDS[lesson.kind];
  return (
    <li data-learned-lesson="" className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-1">
        <RefChips repo={lesson.repo} issue={lesson.issueNumber} pr={lesson.pr}>
          {pills === undefined ? <Pill tone={kind.tone}>{kind.label}</Pill> : pills}
        </RefChips>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-base font-medium text-pretty">
            {href ? (
              <Link href={href} prefetch={false} className="hover:underline">
                {lesson.title}
              </Link>
            ) : (
              lesson.title
            )}
          </span>
          <span className="text-sm text-muted-foreground">{passedLineOf(lesson)}</span>
        </div>
      </div>
      {lesson.learned.length ? (
        <ul aria-label="New things learned" className="grid gap-2 sm:grid-cols-3">
          {lesson.learned.map((step) => {
            const body = (
              <>
                <span className="font-mono text-xs text-muted-foreground">
                  {step.number} · {partsLabelOf(step)}
                </span>
                <span className="text-sm font-medium text-pretty">{step.title}</span>
              </>
            );
            const tile = 'flex h-full flex-col gap-1 rounded-lg border px-3 py-2.5';
            return (
              <li key={step.stepId} data-step={step.stepId}>
                {href ? (
                  <Link
                    href={`${href}#${stepAnchorOf({ id: step.stepId })}` as Route}
                    prefetch={false}
                    className={`${tile} transition-colors hover:bg-accent`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={tile}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
