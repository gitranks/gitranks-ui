'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { setContributeMode } from '../actions';
import { Panel } from './primitives';
import { SetListEditor } from './set-list-editor';
import { FallbackChoice, useSetWrite } from './set-section';
import { Button } from '@/components/ui/button';
import type { ContributeSet, ContributeSetListMode } from '@/lib/contribute/contribute.types';
import { FALLBACKS, listOf, modeTitleOf, plural } from '@/lib/contribute/set-format';
import { SETTINGS_PATHS } from '@/lib/contribute/settings-paths';
import { keptListOf, waitingLibrariesOf } from '@/lib/contribute/settings-summary';
import { cn } from '@/lib/utils';

/** The switch's steps, by the list it builds. */
export const switchStepsOf = (target: ContributeSetListMode) => [
  target === 'STACK' ? 'Your stack' : 'Your repos',
  'When nothing is ready',
  'Review',
];

/**
 * Switching to a mode with a list, one step at a time: its list (each change saved as it is made, on that mode's own
 * list, so the current mode goes on as it is), what it does when the list has nothing ready, then a review that
 * switches. Leaving before the end changes no mode; what was added to the list stays on it.
 */
export function ModeSwitch({
  set: loaded,
  target,
  now,
}: {
  set: ContributeSet;
  target: ContributeSetListMode;
  now?: Date;
}) {
  const router = useRouter();
  const { set, write, setFeedback, feedbackDialog } = useSetWrite(loaded);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const steps = switchStepsOf(target);

  // A new step takes the focus on its heading, so a screen reader starts reading it there; not on the first render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the step changes.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);

  const go = (next: number) => {
    setError(null);
    setStep(next);
  };

  const switchMode = () =>
    startTransition(async () => {
      const failure = await write(() => setContributeMode(target), 'change');
      if (failure) {
        setError(failure);
        return;
      }
      router.push(SETTINGS_PATHS.summary);
    });

  return (
    <div className="flex flex-col gap-5" data-switch={target} data-step={step}>
      <ol aria-label="Steps" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm sm:gap-x-2">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2',
              index === step ? 'font-semibold' : 'text-muted-foreground',
              index > 0 && "sm:before:h-px sm:before:w-4 sm:before:bg-border sm:before:content-['']",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-6 place-items-center rounded-full border font-mono text-xs',
                index === step && 'border-primary bg-primary text-primary-foreground',
                index < step && 'border-transparent bg-brand-soft text-brand-soft-foreground',
              )}
            >
              {index < step ? <Check className="size-3.5" /> : index + 1}
            </span>
            {label}
            <span className="sr-only">{index < step ? ', done' : ''}</span>
          </li>
        ))}
      </ol>

      <Panel>
        <h2 ref={heading} tabIndex={-1} className="sr-only">
          Step {step + 1} of {steps.length}: {steps[step]}
        </h2>
        {step === 0 ? (
          <SetListEditor
            key={target}
            set={set}
            mode={target}
            write={write}
            onFeedback={setFeedback}
            now={now}
            divided={false}
          />
        ) : step === 1 ? (
          <FallbackChoice set={set} mode={target} write={write} divided={false} />
        ) : (
          <SwitchReview set={set} target={target} error={error} onEdit={() => go(0)} />
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost">
          <Link href={SETTINGS_PATHS.summary} prefetch={false}>
            Cancel
          </Link>
        </Button>
        <span className="ml-auto flex flex-wrap gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => go(step - 1)} disabled={pending}>
              Back
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => go(step + 1)}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={switchMode}
              disabled={pending || listOf(set, target).count === 0}
              data-switch-button
            >
              {pending ? 'Switching…' : `Switch to ${modeTitleOf(target)}`}
            </Button>
          )}
        </span>
      </div>
      {feedbackDialog}
    </div>
  );
}

/**
 * The switch's last step: the mode from and to, the list, what happens when it has nothing ready, and what is kept. An
 * empty list cannot be switched to: it says so, with the way back to the list.
 */
export function SwitchReview({
  set,
  target,
  error,
  onEdit,
}: {
  set: ContributeSet;
  target: ContributeSetListMode;
  error?: string | null;
  onEdit: () => void;
}) {
  const { count } = listOf(set, target);
  const fallback = (target === 'STACK' ? set.stack.fallback : set.repos.fallback) ?? 'THEN_ALL';
  const kept = set.mode === 'ALL' ? null : keptListOf(set);
  const waiting = target === 'STACK' ? waitingLibrariesOf(set) : null;

  return (
    <div className="flex flex-col gap-4" data-review>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-y-2">
        <dt className="text-muted-foreground max-sm:pt-1.5">Where issues come from</dt>
        <dd>
          <span className="text-muted-foreground line-through">{modeTitleOf(set.mode)}</span> →{' '}
          <span className="font-medium">{modeTitleOf(target)}</span>
        </dd>
        <dt className="text-muted-foreground max-sm:pt-1.5">{target === 'STACK' ? 'Your stack' : 'Your repos'}</dt>
        <dd className="font-medium">{plural(count, 'repo')}</dd>
        <dt className="text-muted-foreground max-sm:pt-1.5">When nothing is ready</dt>
        <dd className="font-medium">{FALLBACKS.find((each) => each.fallback === fallback)?.label}</dd>
        {kept ? (
          <>
            <dt className="text-muted-foreground max-sm:pt-1.5">Kept</dt>
            <dd>{kept}</dd>
          </>
        ) : null}
      </dl>
      {count === 0 ? (
        <div
          role="alert"
          data-review-empty
          className="flex flex-wrap items-center gap-3 rounded-lg bg-warning-soft px-3.5 py-3 text-sm text-warning-soft-foreground"
        >
          <span className="min-w-0 flex-1">
            Add at least one repo first: with an empty list, your agent has nothing to work on.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Add repos
          </Button>
        </div>
      ) : waiting ? (
        <p data-review-waiting className="rounded-lg bg-brand-soft px-3.5 py-3 text-sm text-brand-soft-foreground">
          {waiting}
        </p>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
