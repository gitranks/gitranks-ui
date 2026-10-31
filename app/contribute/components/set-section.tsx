'use client';

import { Globe, Layers, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { setContributeFallback, setContributeMode } from '../actions';
import { FeedbackDialog, type FeedbackOpen } from './feedback-dialog';
import { LiveRefresh } from './live-refresh';
import { Panel, PanelTitle } from './primitives';
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
import { FALLBACKS, MODES } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

/** Runs a change to the set and shows its answer; resolves to the failure's message, or null. */
export type SetWrite = (
  call: () => Promise<ContributeSetActionResult<ContributeSet>>,
  action: ContributeSetAction,
) => Promise<string | null>;

const ICONS = { STACK: Layers, REPOS: LayoutGrid, ALL: Globe } as const;

/** Whether the page should read itself again: a repo is read for the first time, or the libraries are worked out. */
const settling = (set: ContributeSet) =>
  set.stack.resolve?.state === 'RESOLVING' ||
  [...set.stack.sources, ...set.repos.repos, ...(set.stack.resolve?.targets ?? [])].some(
    ({ status }) => status === 'CHECKING',
  );

/**
 * What the user works on (the mode, its list and what happens when the list has nothing ready), how we pick repos,
 * and the ignored repos. Every change answers the set as it is now, shown at once.
 */
export function SetSections({ set: loaded, now }: { set: ContributeSet; now?: Date }) {
  const router = useRouter();
  const [written, setWritten] = useState<ContributeSet | null>(null);
  const [feedback, setFeedback] = useState<FeedbackOpen | null>(null);
  // The newer of the page's read and the last change's answer.
  const set = written && written.version >= loaded.version ? written : loaded;

  const write: SetWrite = async (call, action) => {
    const result = await call();
    if (!result.ok) return contributeSetErrorMessage(result.error, action, set.limits, result.message);
    setWritten(result.data);
    router.refresh();
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
      <RulesPanel onFeedback={() => setFeedback({ topic: 'GATES', context: { mode: set.mode } })} />
      <IgnoredPanel set={set} write={write} />
      <FeedbackDialog
        open={feedback}
        maxChars={set.limits.feedbackMaxChars}
        perDay={set.limits.feedbackPerDay}
        onClose={() => setFeedback(null)}
      />
      {settling(set) ? <LiveRefresh seconds={20} /> : null}
    </>
  );
}

/** The three modes as native radios: arrows move between them, and picking one switches at once. */
function ModeCards({ mode, write }: { mode: ContributeSetMode; write: SetWrite }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [picking, setPicking] = useState<ContributeSetMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (next: ContributeSetMode) => {
    if (next === mode || pending) return;
    setPicking(next);
    startTransition(async () => {
      setError(await write(() => setContributeMode(next), 'change'));
      setPicking(null);
    });
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Where your issues come from</legend>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {MODES.map((entry) => {
          const on = entry.mode === mode;
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
                disabled={pending}
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
                {picking === entry.mode ? 'Switching…' : entry.text}
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = mode === 'STACK' ? set.stack.fallback : set.repos.fallback;
  const things = mode === 'STACK' ? 'libraries' : 'repos';

  const pick = (fallback: ContributeSetFallback) => {
    if (fallback === current || pending) return;
    startTransition(async () => {
      setError(await write(() => setContributeFallback(mode, fallback), 'change'));
    });
  };

  return (
    <fieldset className="flex flex-col gap-2 border-t pt-4" data-fallback={current}>
      <legend className="float-left mb-2 w-full text-sm font-semibold">When these {things} have nothing ready</legend>
      <div className="flex flex-wrap gap-1.5">
        {FALLBACKS.map(({ fallback, label }) => {
          const on = fallback === current;
          return (
            <button
              key={fallback}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => pick(fallback)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                on
                  ? 'border-primary bg-brand-soft text-brand-soft-foreground'
                  : 'border-dashed text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {current === 'SET_ONLY'
          ? `Your agent works only on these ${things}, and waits when they have nothing ready.`
          : `Issues from these ${things} always come first. When they have nothing ready, your agent works on other issues for you.`}
      </p>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </fieldset>
  );
}
