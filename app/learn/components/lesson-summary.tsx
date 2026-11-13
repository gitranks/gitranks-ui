'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, useTransition } from 'react';

import { rateLesson, shareMyResult } from '../actions';
import { HEADING } from '@/app/contribute/components/primitives';
import { Box } from '@/app/contribute/components/status-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import type { LessonHead, LessonRun, LessonStep } from '@/lib/learn/learn.types';
import { lessonResultPath } from '@/lib/learn/learn-path';
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

/** A shared lesson's summary: whose result it is, so it can be shared. */
export type SummaryShare = {
  slug: string;
  /** The viewer's login, for the address of their result page. */
  login: string;
  /** The viewer wrote the lesson: their result is public already, as their pull request links to it. */
  author: boolean;
};

/**
 * "Share my result": the viewer's result page shows this run, or stops showing it. Another taker's result is private
 * until they switch it on here; the author's is always public.
 */
export function ShareMyResult({ run, share }: { run: LessonRun; share: SummaryShare }) {
  const [shared, setShared] = useState(run.resultPublic);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const resultLink = (
    <Link
      href={lessonResultPath(share.slug, share.login)}
      prefetch={false}
      className="text-sm font-semibold text-link hover:underline"
    >
      Open your result page
    </Link>
  );

  if (share.author) {
    return (
      <div className="flex flex-col gap-1 border-t pt-3" data-share-result="author">
        <p className="text-sm text-muted-foreground">Your result is public: your pull request links to it.</p>
        <div>{resultLink}</div>
      </div>
    );
  }

  const change = (next: boolean) =>
    startTransition(async () => {
      setError(null);
      setShared(next);
      const result = await shareMyResult(run.id, next);
      if (!result.ok) {
        setShared(!next);
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setShared(result.data.resultPublic);
    });

  return (
    <div className="flex flex-col gap-2 border-t pt-3" data-share-result={shared ? 'on' : 'off'}>
      <label htmlFor={id} className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 sm:min-h-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={shared}
          aria-describedby={`${id}-hint`}
          checked={shared}
          disabled={pending}
          onChange={(event) => change(event.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-sm font-semibold">Share my result</span>
      </label>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {shared
          ? 'Anyone with the link to your result page sees how you did on each step. Never an answer you picked.'
          : 'Your result is private. Shared, your result page shows how you did on each step, never an answer you picked.'}
      </p>
      {shared ? <div>{resultLink}</div> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The lesson passed: what the user knew before, what they learned here and how long it took, the topics, and "Was this
 * lesson worth your time?". Then the page opens the pull request's form; a shared lesson has no pull request, and ends
 * with "Share my result" (`share`).
 */
export function LessonSummary({
  run,
  head,
  steps,
  share,
}: {
  run: LessonRun;
  head: LessonHead | null;
  steps: readonly LessonStep[];
  share?: SummaryShare;
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
        {knew || !share ? (
          <p className="text-sm text-muted-foreground">
            {knew ? `You knew ${knew} before the lesson.` : ''}
            {knew && !share ? ' ' : ''}
            {share ? '' : 'The pull request is now yours to approve.'}
          </p>
        ) : null}
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
        {share ? <ShareMyResult run={run} share={share} /> : null}
      </section>
    </>
  );
}
