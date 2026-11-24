'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { signInBackHere } from '@/components/workspace/getting-in/flow-sign-in';
import { savePreferences } from '@/lib/contribute/actions';
import { type WorkPicks, withWorkPicks } from '@/lib/contribute/start-flow';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import type { ContributeLanguage } from '@/lib/workspace/contribute.types';
import { LANGUAGES } from '@/lib/workspace/format';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

/** One card of tick boxes: its title, a line that counts the picks (or says none is every one), the grid. */
function TickCard<T extends string>({
  title,
  hint,
  none,
  options,
  picked,
  onToggle,
}: {
  title: string;
  hint: string;
  none: string;
  options: Record<T, string>;
  picked: readonly T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5 dark:shadow-none">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-1 text-base font-semibold">{title}</legend>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {picked.length ? `${hint} ${picked.length} picked.` : none}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(Object.keys(options) as T[]).map((value) => {
            const on = picked.includes(value);
            return (
              <label
                key={value}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                  on ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'hover:bg-muted/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(value)}
                  className="size-4 shrink-0 accent-primary"
                  data-pick={value}
                />
                {options[value]}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/**
 * What you work on, the first step of Contribute's flow: languages as tick boxes, then Continue. A
 * visitor's picks ride in the address to the next step, nothing saved; a signed-in person's are saved first. A visitor
 * may sign in here to have the languages filled in from their repositories, the picks made so far kept.
 */
export function WorkStep({ initial, signedIn }: { initial: WorkPicks; signedIn: boolean }) {
  const router = useRouter();
  const [picks, setPicks] = useState<WorkPicks>(initial);
  const [failed, setFailed] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [pending, startTransition] = useTransition();

  const next = () => {
    setFailed(false);
    if (!signedIn) {
      router.push(withWorkPicks(GETTING_IN_PATHS.contributeAgent, picks));
      return;
    }
    startTransition(async () => {
      const saved = await savePreferences({ languages: picks.languages });
      if (saved.ok) router.push(GETTING_IN_PATHS.contributeAgent);
      else setFailed(true);
    });
  };

  const signIn = () => {
    setSigningIn(true);
    // Back to this step with the picks so far in the address.
    window.history.replaceState(window.history.state, '', withWorkPicks(GETTING_IN_PATHS.contributeWork, picks));
    signInBackHere().catch(() => setSigningIn(false));
  };

  return (
    <div className="flex flex-col gap-5" data-work-step={signedIn ? 'signed-in' : 'visitor'}>
      {signedIn ? null : (
        <button
          type="button"
          onClick={signIn}
          disabled={signingIn}
          className="flex min-h-11 items-center gap-2 self-start text-left text-sm font-semibold text-link hover:underline disabled:opacity-50 sm:min-h-0"
          data-sign-in="work"
          {...contributeSource('contribute_flow_sign_in')}
        >
          <FaGithub aria-hidden="true" className="size-4" />
          Sign in with GitHub to fill this in from your repositories
        </button>
      )}
      <TickCard<ContributeLanguage>
        title="Languages"
        hint="Pick the ones you write."
        none="None picked: every language the pool has."
        options={LANGUAGES}
        picked={picks.languages}
        onToggle={(language) => setPicks((now) => ({ ...now, languages: toggle(now.languages, language) }))}
      />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          onClick={next}
          disabled={pending}
          className="min-h-11 self-start font-semibold max-sm:w-full"
          {...contributeSource('contribute_flow_work')}
        >
          Continue
        </Button>
        {failed ? (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t save. Try again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
