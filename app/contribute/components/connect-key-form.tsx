'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useState, useTransition } from 'react';

import { connectClaudeKey } from '../actions';
import { ConnectResult, STORED_RESULTS } from './connect-result';
import type { ContributeClaudePlan, ContributeConnectKeyResult } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { ordinalDay, PLANS } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

const inputClass =
  'rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

type Props = {
  defaultPlan?: ContributeClaudePlan | null;
  defaultRenewalDay?: number;
  /** Shown before a first check, or once one came back. */
  initialOutcome?: ContributeConnectKeyResult;
  /** A key is already connected: a new one replaces it. */
  replacing?: boolean;
};

/** The plan, the key, the renewal day and the spend-limit confirmation, checked and saved in one go. */
export function ConnectKeyForm({ defaultPlan, defaultRenewalDay, initialOutcome, replacing = false }: Props) {
  const router = useRouter();
  const id = useId();
  const [plan, setPlan] = useState<ContributeClaudePlan>(defaultPlan ?? 'MAX_5X');
  const [key, setKey] = useState('');
  const [renewalDay, setRenewalDay] = useState(defaultRenewalDay ?? new Date().getUTCDate());
  const [cycleCap, setCycleCap] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [outcome, setOutcome] = useState<ContributeConnectKeyResult | undefined>(initialOutcome);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cap = Number(cycleCap);
  const needsCap = plan === 'CREDITS';
  const capValid = !needsCap || (cycleCap !== '' && Number.isFinite(cap) && cap > 0);
  const canSubmit = key.trim().length > 0 && confirmed && capValid && !pending;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await connectClaudeKey({
        key,
        plan,
        renewalDay,
        confirmedLimit: confirmed,
        ...(needsCap ? { cycleCapUsd: cap } : {}),
      });
      if (!result.ok) {
        setOutcome(undefined);
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOutcome(result.data);
      if (STORED_RESULTS.has(result.data.result)) {
        setKey('');
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 rounded-xl border bg-card p-5 sm:p-6"
    >
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-semibold">Your plan</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {PLANS.map((entry) => {
            const inputId = `${id}-plan-${entry.plan}`;
            const checked = plan === entry.plan;
            return (
              <label
                key={entry.plan}
                htmlFor={inputId}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-3',
                  checked && 'border-primary border-[1.5px] bg-violet-50/60 dark:bg-violet-950/30',
                )}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="plan"
                  value={entry.plan}
                  checked={checked}
                  onChange={() => setPlan(entry.plan)}
                  className="mt-1 accent-primary"
                />
                <span className="flex flex-col">
                  <span className="font-medium">{entry.title}</span>
                  <span className="text-sm text-muted-foreground">{entry.text}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {needsCap ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-cap`} className="font-semibold">
            How much to spend each cycle, in USD
          </label>
          <input
            id={`${id}-cap`}
            inputMode="decimal"
            value={cycleCap}
            onChange={(event) => setCycleCap(event.target.value)}
            placeholder="50"
            className={cn(inputClass, 'max-w-40 font-mono text-sm')}
          />
          <span className="text-sm text-muted-foreground">
            Bought credits do not expire, so set what you are happy to spend each month.
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-key`} className="font-semibold">
          API key
        </label>
        <input
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
          className={cn(inputClass, 'font-mono text-sm')}
        />
        <span className="text-sm text-muted-foreground">
          Stored encrypted. Opened only when an attempt starts. You can remove it any time.
          {replacing ? ' A new key replaces the one you connected.' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-day`} className="font-semibold">
          Your credits renew on
        </label>
        <select
          id={`${id}-day`}
          value={renewalDay}
          onChange={(event) => setRenewalDay(Number(event.target.value))}
          className={cn(inputClass, 'max-w-56')}
        >
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {ordinalDay(day)} of each month
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          Your billing date on claude.ai. Unused credits expire then, so we pace work around it.
        </span>
      </div>

      <label htmlFor={`${id}-confirm`} className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          id={`${id}-confirm`}
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 accent-primary"
          required
        />
        <span>I created a separate workspace for this key and set its monthly spend limit</span>
      </label>

      <div className="flex flex-wrap items-center gap-3.5">
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Checking…' : 'Check and save key'}
        </button>
        <span className="text-sm text-muted-foreground">The check is one tiny request, well under a cent.</span>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {outcome ? <ConnectResult outcome={outcome} /> : null}
    </form>
  );
}
