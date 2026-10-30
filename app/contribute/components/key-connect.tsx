'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useId, useState, useTransition } from 'react';

import { connectClaudeKey } from '../actions';
import { ConnectResult, STORED_RESULTS } from './connect-result';
import { LimitsManual } from './limits-manual';
import { ISSUES_PATH, Matching } from './matching';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  appliedLimitsOf,
  connectLimitsOf,
  type LimitsMode,
  type ManualLimitsDraft,
  manualDraftOf,
  manualLimitsOf,
  PLAN_CHOICES,
  renewalLabelOf,
  type StoredLimits,
} from '@/lib/contribute/connect-limits';
import type { ContributeClaudePlan, ContributeConnectKeyResult } from '@/lib/contribute/contribute.types';
import { CONNECT_AGENT_PATH } from '@/lib/contribute/contribute-path';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { cn } from '@/lib/utils';

const CONSOLE_URL = 'https://platform.claude.com/settings/workspaces';
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

const card = 'flex flex-col rounded-2xl border bg-card p-4.5 sm:p-5.5';
const cardTitle = 'text-lg font-bold';

export type KeyConnectProps = {
  /** The plan a key was connected with before; the plan's limits start from Max 5x otherwise. */
  defaultPlan?: ContributeClaudePlan | null;
  /** "I'll set them myself" as the stored settings have it, for a key connected before. */
  defaultManual?: Partial<ManualLimitsDraft>;
  /** A key connected before: the plan and settings the connect keeps, said in "The limits we apply". */
  stored?: StoredLimits | null;
  /** The reset day already set; else `guessDay` is taken. */
  renewalDay?: number | null;
  /** Today (UTC): our guess at the reset day. */
  guessDay: number;
  /** A key is connected: a new one replaces it, and the page stays here. */
  replacing?: boolean;
  /** Not onboarded yet: a stored key goes on to the matching moment. */
  firstKey?: boolean;
  /** The profile's languages, for the matching moment. */
  languages?: string[];
  /** The key's own trouble, under the heading. */
  notices?: ReactNode;
};

/**
 * A1, the hosted path's one screen: a key from a separate Claude Console workspace, then the limits, from the plan or
 * set by hand, and the reset day. A first key that is stored goes on to the matching moment in place; one that is
 * refused keeps the form and says why under the button.
 */
export function KeyConnect({
  defaultPlan,
  defaultManual,
  stored = null,
  renewalDay,
  guessDay,
  replacing = false,
  firstKey = !replacing,
  languages = [],
  notices,
}: KeyConnectProps) {
  const router = useRouter();
  const id = useId();
  const [confirmed, setConfirmed] = useState(false);
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<LimitsMode>(defaultPlan === 'CREDITS' ? 'manual' : 'plan');
  const [plan, setPlan] = useState<ContributeClaudePlan>(
    defaultPlan && defaultPlan !== 'CREDITS' ? defaultPlan : 'MAX_5X',
  );
  const [manual, setManual] = useState(() => manualDraftOf(defaultManual));
  const [day, setDay] = useState(renewalDay ?? guessDay);
  const [outcome, setOutcome] = useState<ContributeConnectKeyResult | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [pending, startTransition] = useTransition();

  const own = manualLimitsOf(manual);
  const limitsReady = mode === 'plan' || own.ok;
  const canSubmit = confirmed && key.trim().length > 0 && limitsReady && !pending;
  // Why the button is off, said beside it: the checkbox's own `required` never speaks while the button is disabled.
  const missing = [
    confirmed ? null : 'tick the box in step 1',
    key.trim() ? null : 'paste your key in step 2',
    limitsReady ? null : 'fix the limits in step 3',
  ].filter((step): step is string => step !== null);
  const whyId = `${id}-why`;
  const applied = appliedLimitsOf(mode, plan, manual, stored);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await connectClaudeKey({
        key,
        plan: mode === 'manual' ? 'CREDITS' : plan,
        renewalDay: day,
        confirmedLimit: confirmed,
        // Only what differs from the stored settings: a replace keeps the rest, a QUEUED pace among it.
        ...(mode === 'manual' && own.ok
          ? { cycleCapUsd: own.cycleCapUsd, limits: connectLimitsOf(own.limits, stored?.settings ?? null) }
          : {}),
      });
      if (!result.ok) {
        setOutcome(undefined);
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOutcome(result.data);
      if (!STORED_RESULTS.has(result.data.result)) return;
      setKey('');
      if (firstKey) setMatching(true);
      else router.refresh();
    });
  };

  if (matching) return <Matching languages={languages} />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5" data-connect-path="key">
      <div className="flex flex-col gap-2 pb-1">
        <span className="text-xs font-semibold text-primary">
          {replacing ? 'Replace your key' : 'The only step · about two minutes'}
        </span>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {replacing ? 'Connect a new Claude key' : 'Connect your Claude key'}
        </h1>
        <p className="text-foreground/80">
          {replacing
            ? 'A new key replaces the one you connected. Your limits and picks stay as they are, unless you change them here.'
            : "Everything else starts from sensible defaults. You'll see your first issues right after this."}
        </p>
        {replacing ? (
          <Link href={ISSUES_PATH} prefetch={false} className="text-sm font-semibold text-primary">
            See your issues →
          </Link>
        ) : (
          <Link href={CONNECT_AGENT_PATH} prefetch={false} className="text-sm font-semibold text-primary">
            Use your own agent instead →
          </Link>
        )}
      </div>
      {notices}

      <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:gap-5">
        <section aria-labelledby={`${id}-k1`} className={cn(card, 'gap-3.5')}>
          <h2 id={`${id}-k1`} className={cardTitle}>
            1 · Create a key in the Claude Console
          </h2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground/80">
            <li>
              <span className="font-semibold text-foreground">Create a workspace named gitranks.</span> It keeps this
              spend apart from your other projects.
            </li>
            <li>
              <span className="font-semibold text-foreground">Set its spend limit, and keep auto-reload off.</span> The
              Console enforces the limit, whatever happens here; auto-reload would top it up.
            </li>
            <li>
              <span className="font-semibold text-foreground">Create an API key in that workspace.</span>
            </li>
          </ol>
          <label htmlFor={`${id}-confirm`} className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              id={`${id}-confirm`}
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
              className="mt-px size-5 flex-none accent-primary"
            />
            <span>
              The key is from a separate workspace with a monthly spend limit{' '}
              <span className="text-muted-foreground">(required: we can&apos;t check it from the key)</span>
            </span>
          </label>
          <Button asChild variant="outline" className="min-h-11 self-start px-4 font-semibold">
            <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
              Open the Claude Console ↗
            </a>
          </Button>
        </section>

        <section aria-labelledby={`${id}-k2`} className={cn(card, 'gap-2')}>
          <h2 id={`${id}-k2`} className={cn(cardTitle, 'mb-1.5')}>
            <label htmlFor={`${id}-key`}>2 · Paste the key</label>
          </h2>
          <Input
            id={`${id}-key`}
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="sk-ant-api03-…"
            autoComplete="off"
            spellCheck={false}
            // Not a password: keep password managers from saving or filling it.
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            className="h-11.5 font-mono md:text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Stored encrypted, used only for your attempts. Remove it any time.
          </span>
        </section>

        <section aria-labelledby={`${id}-k3`} className={cn(card, 'gap-4.5')}>
          <div className="flex flex-col gap-1.5">
            <h2 id={`${id}-k3`} className={cardTitle}>
              3 · Limit what the agent spends
            </h2>
            <span className="text-xs text-muted-foreground">
              We never charge you anything. The agent spends your own API credits, and these limits keep it within what
              you&apos;re happy to use.
            </span>
          </div>
          <fieldset className="grid grid-cols-2 gap-1 self-stretch rounded-xl bg-muted p-1 sm:inline-flex sm:self-start">
            <legend className="sr-only">Limits</legend>
            {(
              [
                ['plan', 'From my Claude plan'],
                ['manual', "I'll set them myself"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'min-h-10 rounded-md px-2 text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm',
                  mode === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>

          {mode === 'plan' ? (
            <div className="flex flex-col gap-2" data-limits="plan">
              <fieldset className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
                <legend className="sr-only">Your Claude plan</legend>
                {PLAN_CHOICES.map((choice) => (
                  <button
                    key={choice.plan}
                    type="button"
                    aria-pressed={plan === choice.plan}
                    onClick={() => setPlan(choice.plan)}
                    className={cn(
                      'min-h-12 rounded-xl px-3 text-sm font-semibold transition-colors',
                      plan === choice.plan
                        ? 'border-2 border-primary bg-brand-soft'
                        : 'border border-input bg-background hover:bg-accent',
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </fieldset>
              <span className="text-xs text-muted-foreground">
                We start the limits from the API allowance your plan includes each month.
              </span>
            </div>
          ) : (
            <LimitsManual id={`${id}-limits`} draft={manual} onChange={setManual} />
          )}

          <div className="flex flex-col gap-1.5 border-t pt-4">
            <label htmlFor={`${id}-day`} className="text-sm font-semibold">
              On which day of the month do your API credits reset?
            </label>
            <select
              id={`${id}-day`}
              value={day}
              onChange={(event) => setDay(Number(event.target.value))}
              className="min-h-11 max-w-64 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {DAYS.map((option) => (
                <option key={option} value={option}>
                  {renewalLabelOf(option, renewalDay ? null : guessDay)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              So we can spread the agent&apos;s work over your month: credits that would expire get used before the
              reset, and it never runs dry in the first week. Not sure? Keep our guess and change it in Settings.
            </span>
          </div>
        </section>

        <section
          aria-labelledby={`${id}-k4`}
          className="flex flex-col gap-3.5 rounded-2xl bg-brand-soft p-4.5 sm:p-5.5"
          data-limits-applied={mode}
        >
          <h2 id={`${id}-k4`} className="text-base font-bold">
            The limits we apply
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[minmax(110px,auto)_1fr] sm:gap-y-1.5">
            {applied.limits.map(({ label, value }, index) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={cn('mb-2 text-foreground sm:mb-0', index === 0 && 'font-semibold')}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 border-t border-primary/20 pt-3">
            <span className="text-base font-bold">What we picked for you</span>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-1.5 text-sm text-foreground/80">
              {applied.picked.map(({ label, value }) => (
                <li key={label}>
                  {label}: <span className="font-semibold text-foreground">{value}</span>
                </li>
              ))}
            </ul>
          </div>
          <span className="text-xs text-muted-foreground">
            All of it is in Settings, whenever you want to change it.
          </span>
        </section>

        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          aria-describedby={!pending && missing.length ? whyId : undefined}
          className="min-h-13 px-5.5 text-base font-semibold"
        >
          {pending ? 'Checking your key…' : replacing ? 'Connect the new key' : 'Connect and find issues'}
        </Button>
        {!pending && missing.length ? (
          <p id={whyId} data-connect-missing className="-mt-2 text-center text-xs text-muted-foreground">
            To continue, {missing.join(', then ')}.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        {outcome ? <ConnectResult outcome={outcome} /> : null}
      </form>
    </div>
  );
}
