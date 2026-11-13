'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';

import { rateLesson } from '../actions';
import { HEADING } from '@/app/contribute/components/primitives';
import { Box } from '@/app/contribute/components/status-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LessonHead, LessonRun, LessonStep } from '@/lib/learn/learn.types';
import { warmupCountOf } from '@/lib/learn/lesson-format';
import { isStepDone } from '@/lib/learn/question';
import { cn } from '@/lib/utils';

const things = (count: number) => `${count} new thing${count === 1 ? '' : 's'}`;

/** One figure of a lesson: the number, and what it counts under it. */
export function Figure({ value, label }: { value: string; label: string }) {
  return (
    // The term first, as a list of terms reads; the number shows above it.
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * The lesson passed: what the user knew before, what they learned here and how long it took, the topics, and "Was this
 * lesson worth your time?". Then the page opens the pull request's form.
 */
export function LessonSummary({
  run,
  head,
  steps,
}: {
  run: LessonRun;
  head: LessonHead | null;
  steps: readonly LessonStep[];
}) {
  const [worthIt, setWorthIt] = useState<boolean | null>(run.worthIt);
  const summary = run.summary;
  const passed = run.steps.filter((result) => isStepDone(result)).length;
  const warmup = warmupCountOf(head?.kind);
  const knew = summary ? (warmup ? `${summary.knewBefore} of ${warmup}` : String(summary.knewBefore)) : null;

  const rate = (value: boolean) => {
    setWorthIt(value);
    void rateLesson(run.id, value);
  };

  return (
    <>
      <Box state="LEARN_DONE">
        <h2 className={HEADING.card}>
          {summary && summary.learned > 0 ? `Lesson done. You learned ${things(summary.learned)}` : 'Lesson done'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {knew ? `You knew ${knew} before the lesson. ` : ''}The pull request is now yours to approve.
        </p>
      </Box>
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-lesson-summary="">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure value={`${passed} of ${steps.length}`} label="steps passed" />
          {knew ? <Figure value={knew} label="known before" /> : null}
          {summary ? <Figure value={String(summary.learned)} label="learned here" /> : null}
          {summary ? <Figure value={`${summary.minutes} min`} label="time spent" /> : null}
        </dl>
        {head?.topics.length ? (
          <div className="flex flex-col gap-2 border-t pt-3">
            <h3 className="text-sm font-semibold">What you learned</h3>
            <div className="flex flex-wrap gap-1.5">
              {head.topics.map((topic) => (
                <Badge key={topic} variant="outline">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-sm text-muted-foreground" id={`worth-${run.id}`}>
            Was this lesson worth your time?
          </span>
          <fieldset className="m-0 flex items-center gap-2 border-0 p-0" aria-labelledby={`worth-${run.id}`}>
            {[
              { value: true, label: 'Yes', Icon: ThumbsUp },
              { value: false, label: 'No', Icon: ThumbsDown },
            ].map(({ value, label, Icon }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={worthIt === value}
                onClick={() => rate(value)}
                className={cn(
                  'h-8 gap-1.5 px-3 max-sm:min-h-11',
                  worthIt === value && 'border-primary bg-brand-soft/40',
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Button>
            ))}
          </fieldset>
        </div>
      </section>
    </>
  );
}
