'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setContributeFallback } from '../actions';
import { announceActivity } from './activity';
import { FeedbackDialog, type FeedbackOpen } from './feedback-dialog';
import { RadioPills, useSettledPick } from './radio-pills';
import type { ContributeSet, ContributeSetFallback, ContributeSetListMode } from '@/lib/contribute/contribute.types';
import {
  type ContributeSetAction,
  type ContributeSetActionResult,
  contributeSetErrorMessage,
} from '@/lib/contribute/errors';
import { FALLBACKS, settlingOf, stackPendingOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

/** Runs a change to the set and shows its answer; resolves to the failure's message, or null. */
export type SetWrite = (
  call: () => Promise<ContributeSetActionResult<ContributeSet>>,
  action: ContributeSetAction,
) => Promise<string | null>;

/**
 * The set as the page read it, or the answer to the user's last change if newer, `write` to change it, and whether a
 * change is on its way. The feedback dialog is opened through `setFeedback`.
 */
export function useSetWrite(loaded: ContributeSet) {
  const router = useRouter();
  const [written, setWritten] = useState<ContributeSet | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOpen | null>(null);
  const [writing, setWriting] = useState(0);
  // The newer of the page's read and the last change's answer.
  const set = written && written.version >= loaded.version ? written : loaded;

  const write: SetWrite = async (call, action) => {
    setWriting((count) => count + 1);
    const result = await call().finally(() => setWriting((count) => count - 1));
    if (!result.ok) return contributeSetErrorMessage(result.error, action, set.limits, result.message);
    // Answers can come back out of order: keep the newest.
    setWritten((current) => (current && current.version > result.data.version ? current : result.data));
    router.refresh();
    // A repo read for the first time, or the libraries worked out, on either list (the switch fills the one it moves
    // to): the bar under the tabs follows it from here.
    if ((['STACK', 'REPOS'] as const).some((mode) => settlingOf({ ...result.data, mode }))) announceActivity();
    return null;
  };

  const feedbackDialog = (
    <FeedbackDialog
      open={feedback}
      maxChars={set.limits.feedbackMaxChars}
      perDay={set.limits.feedbackPerDay}
      onClose={() => setFeedback(null)}
    />
  );

  return { set, write, writing: writing > 0, setFeedback, feedbackDialog };
}

/** What a list's mode does when the list has nothing ready. */
export function FallbackChoice({
  set,
  mode,
  write,
  divided = true,
}: {
  set: ContributeSet;
  mode: ContributeSetListMode;
  write: SetWrite;
  /** A rule above it, under what comes before it in its panel. */
  divided?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [chosen, setChosen] = useState<ContributeSetFallback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = mode === 'STACK' ? set.stack.fallback : set.repos.fallback;
  const shown = chosen ?? current;
  const things = mode === 'STACK' ? 'libraries' : 'repos';

  const save = useSettledPick((fallback: ContributeSetFallback) => {
    if (fallback === current) {
      setChosen(null);
      return;
    }
    startTransition(async () => {
      setError(await write(() => setContributeFallback(mode, fallback), 'change'));
      setChosen(null);
    });
  });

  return (
    <div className={cn('flex flex-col gap-2', divided && 'border-t pt-4')} data-fallback={shown}>
      <RadioPills
        legend={`When these ${things} have nothing ready`}
        legendClassName="font-semibold"
        options={FALLBACKS.map(({ fallback, label }) => ({ value: fallback, label }))}
        value={shown}
        onChange={(fallback) => {
          setError(null);
          setChosen(fallback);
          save(fallback);
        }}
      />
      <p className="text-xs text-muted-foreground">
        {shown === 'SET_ONLY'
          ? `Your agent works only on these ${things}, and waits when they have nothing ready.`
          : `Issues from these ${things} always come first. When they have nothing ready, your agent works on other issues for you.`}
        {mode === 'STACK' && stackPendingOf(set)
          ? ' Until a library of your stack is read, your agent works on all issues either way.'
          : ''}
      </p>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
