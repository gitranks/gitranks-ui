'use client';

import { Globe, Layers, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useId, useState, useTransition } from 'react';

import { setContributeFallback, setContributeMode } from '../actions';
import { announceActivity } from './activity';
import { FeedbackDialog, type FeedbackOpen } from './feedback-dialog';
import { Panel, PanelTitle } from './primitives';
import { RadioPills, useSettledPick } from './radio-pills';
import { SetListEditor } from './set-list-editor';
import { IgnoredPanel, RulesPanel } from './set-panels';
import { StackTargets } from './stack-targets';
import type {
  ContributeSet,
  ContributeSetFallback,
  ContributeSetListMode,
  ContributeSetMode,
} from '@/lib/contribute/contribute.types';
import {
  type ContributeSetAction,
  type ContributeSetActionResult,
  contributeSetErrorMessage,
} from '@/lib/contribute/errors';
import { FALLBACKS, MODES, settlingOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

/** Runs a change to the set and shows its answer; resolves to the failure's message, or null. */
export type SetWrite = (
  call: () => Promise<ContributeSetActionResult<ContributeSet>>,
  action: ContributeSetAction,
) => Promise<string | null>;

const ICONS = { STACK: Layers, REPOS: LayoutGrid, ALL: Globe } as const;

/**
 * What the user works on (the mode, its list and what happens when the list has nothing ready), then `preferences`,
 * how we pick repos, and the ignored repos. Every change answers the set as it is now, shown at once.
 */
export function SetSections({
  set: loaded,
  now,
  preferences,
}: {
  set: ContributeSet;
  now?: Date;
  /** Shown right after what to work on. */
  preferences?: ReactNode;
}) {
  const router = useRouter();
  const [written, setWritten] = useState<ContributeSet | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOpen | null>(null);
  // The newer of the page's read and the last change's answer.
  const set = written && written.version >= loaded.version ? written : loaded;

  const write: SetWrite = async (call, action) => {
    const result = await call();
    if (!result.ok) return contributeSetErrorMessage(result.error, action, set.limits, result.message);
    // Answers can come back out of order: keep the newest.
    setWritten((current) => (current && current.version > result.data.version ? current : result.data));
    router.refresh();
    // A repo read for the first time, or the libraries worked out: the bar under the tabs follows it from here.
    if (settlingOf(result.data)) announceActivity();
    return null;
  };

  return (
    <>
      <Panel id="modes">
        <PanelTitle
          title="What to work on"
          text="Pick where your issues come from. Your language and issue preferences apply on top, in every mode."
        />
        <ModeCards mode={set.mode} write={write} />
        {set.mode === 'ALL' ? null : (
          <>
            <SetListEditor key={set.mode} set={set} mode={set.mode} write={write} onFeedback={setFeedback} now={now} />
            {set.mode === 'STACK' ? <StackTargets set={set} write={write} onFeedback={setFeedback} now={now} /> : null}
            <FallbackChoice set={set} mode={set.mode} write={write} />
          </>
        )}
      </Panel>
      {preferences}
      <RulesPanel onFeedback={() => setFeedback({ topic: 'GATES', context: { mode: set.mode } })} />
      <IgnoredPanel set={set} write={write} />
      <FeedbackDialog
        open={feedback}
        maxChars={set.limits.feedbackMaxChars}
        perDay={set.limits.feedbackPerDay}
        onClose={() => setFeedback(null)}
      />
    </>
  );
}

/**
 * The three modes as native radios: arrows move between them, the pick is shown at once and saved once the user
 * stops, so arrowing past one mode to the next saves only the last.
 */
function ModeCards({ mode, write }: { mode: ContributeSetMode; write: SetWrite }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<ContributeSetMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = chosen ?? mode;

  const save = useSettledPick((next: ContributeSetMode) => {
    if (next === mode) {
      setChosen(null);
      return;
    }
    startTransition(async () => {
      const failure = await write(() => setContributeMode(next), 'change');
      setError(failure);
      setChosen(null);
    });
  });

  const pick = (next: ContributeSetMode) => {
    setError(null);
    setChosen(next);
    save(next);
  };

  return (
    <fieldset className="flex flex-col gap-2" aria-busy={pending || undefined}>
      <legend className="sr-only">Where your issues come from</legend>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {MODES.map((entry) => {
          const on = entry.mode === shown;
          const Icon = ICONS[entry.mode];
          return (
            <label
              key={entry.mode}
              htmlFor={`${id}-${entry.mode}`}
              data-mode={entry.mode}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                on ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'hover:bg-muted/60',
              )}
            >
              <input
                id={`${id}-${entry.mode}`}
                type="radio"
                name={`${id}-mode`}
                value={entry.mode}
                checked={on}
                onChange={() => pick(entry.mode)}
                className="sr-only"
              />
              <span className="flex w-full items-center gap-2 text-sm font-semibold">
                <Icon aria-hidden="true" className={cn('size-4', !on && 'text-muted-foreground')} />
                {entry.title}
                <span
                  aria-hidden="true"
                  className={cn('ml-auto size-3.5 rounded-full border', on && 'border-4 border-primary bg-background')}
                />
              </span>
              <span className={cn('text-xs', on ? 'opacity-80' : 'text-muted-foreground')}>
                {on && pending ? 'Switching…' : entry.text}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}

/** What a list's mode does when the list has nothing ready. */
function FallbackChoice({ set, mode, write }: { set: ContributeSet; mode: ContributeSetListMode; write: SetWrite }) {
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
    <div className="flex flex-col gap-2 border-t pt-4" data-fallback={shown}>
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
      </p>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
