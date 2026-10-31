'use client';

import { Check, ChevronDown, Clock, Globe, Layers, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setContributeFallback, setContributeMode } from '../actions';
import { Eyebrow } from './primitives';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ContributeLanguage, ContributeSet, ContributeSetMode } from '@/lib/contribute/contribute.types';
import { contributeSetErrorMessage } from '@/lib/contribute/errors';
import { LANGUAGES } from '@/lib/contribute/format';
import { MODES, modeChipOf, modeSummaryOf, plural, setReposOf, setSizeOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

const ICONS = { STACK: Layers, REPOS: LayoutGrid, ALL: Globe } as const;

/** The mode chip by the Issues page's title, with a switcher; nothing in the "All issues" mode. */
export function ModeSwitcher({ set }: { set: ContributeSet }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const chip = modeChipOf(set);
  if (!chip) return null;
  const Icon = ICONS[set.mode];

  const pick = (mode: ContributeSetMode) => {
    if (mode === set.mode) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await setContributeMode(mode);
      if (!result.ok) {
        setError(contributeSetErrorMessage(result.error, 'change', set.limits, result.message));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-1" data-mode-chip={set.mode}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex max-w-full items-center gap-2 rounded-full border border-primary bg-brand-soft px-3.5 py-1.5 text-left text-sm text-brand-soft-foreground"
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span>
              {chip.title} <span className="opacity-70">· {chip.detail}</span>
            </span>
            <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="sr-only">: change where your issues come from</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-xl p-1.5">
          <div className="flex flex-col gap-1">
            {MODES.map((entry) => {
              const on = entry.mode === set.mode;
              return (
                <button
                  key={entry.mode}
                  type="button"
                  aria-pressed={on}
                  disabled={pending}
                  onClick={() => pick(entry.mode)}
                  className={cn(
                    'flex flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-muted',
                    on && 'bg-muted',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {on ? <Check aria-hidden="true" className="size-3.5" /> : null}
                    {entry.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{modeSummaryOf(set, entry.mode)}</span>
                </button>
              );
            })}
          </div>
          {error ? (
            <span role="alert" className="px-3 text-xs text-destructive">
              {error}
            </span>
          ) : null}
          <Link
            href="/contribute/settings#modes"
            prefetch={false}
            className="border-t px-3 pt-2 pb-1 text-sm text-link hover:underline"
          >
            Edit lists in Settings →
          </Link>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The line above the other issues: the user's list had nothing (more) ready, so these follow it. */
export function OtherIssuesDivider({ set, none }: { set: ContributeSet; none: boolean }) {
  const own = set.mode === 'STACK' ? "your stack's issues" : "your list's issues";
  return (
    <div className="flex flex-col gap-1 pt-3" data-divider="other">
      <div className="flex items-center gap-3">
        <Eyebrow>{none ? 'Your list has nothing ready: other issues for you' : 'Other issues for you'}</Eyebrow>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <p className="text-xs text-muted-foreground">
        Shown {none ? 'instead of' : 'below'} {own}, because you chose &quot;Work on all issues meanwhile&quot;.{' '}
        <Link href="/contribute/settings#modes" prefetch={false} className="text-link hover:underline">
          Change
        </Link>
      </p>
    </div>
  );
}

/** The heading over the user's own list's issues. */
export function SetIssuesHeading({ set }: { set: ContributeSet }) {
  return (
    <div className="flex items-center gap-3" data-divider="set">
      <Eyebrow>{set.mode === 'STACK' ? 'From your stack' : 'From your list'}</Eyebrow>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Only the user's list, and it has nothing ready: why, and two ways on (work on all issues meanwhile, or add repos).
 */
export function SetOnlyEmpty({
  set,
  languages,
}: {
  set: ContributeSet & { mode: 'STACK' | 'REPOS' };
  languages: ContributeLanguage[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mode = set.mode;
  const size = setSizeOf(set, mode);
  const repos = setReposOf(set, mode);
  const reading = repos.filter(({ status }) => status === 'CHECKING').length;
  const outside = languages.length
    ? repos.filter(({ language }) => language && !languages.includes(language)).length
    : 0;
  const things = mode === 'STACK' ? plural(size, 'library', 'libraries') : plural(size, 'repo');

  const meanwhile = () =>
    startTransition(async () => {
      setError(null);
      const result = await setContributeFallback(mode, 'THEN_ALL');
      if (!result.ok) {
        setError(contributeSetErrorMessage(result.error, 'change', set.limits, result.message));
        return;
      }
      router.refresh();
    });

  return (
    <section
      className="flex flex-col items-center gap-4 rounded-xl border bg-card px-5 py-12 text-center"
      data-empty="set-only"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
        <Clock aria-hidden="true" className="size-5" />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-lg font-semibold">
          {size ? `Your ${things} have no issues ready right now` : 'Your list is empty'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {size
            ? `We check them for new issues every 12 hours.${reading ? ` ${plural(reading, 'repo')} ${reading === 1 ? 'is' : 'are'} still being read for the first time.` : ''} Your agent waits meanwhile.`
            : 'Add repos to it in Settings, or work on all issues meanwhile. Your agent waits until then.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={meanwhile} disabled={pending}>
          {pending ? 'Switching…' : 'Work on all issues meanwhile'}
        </Button>
        <Button asChild variant="outline">
          <Link href="/contribute/settings#modes" prefetch={false}>
            {mode === 'STACK' ? 'Add more sources' : 'Add more repos'}
          </Link>
        </Button>
      </div>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      {outside ? (
        <p className="text-xs text-muted-foreground">
          Language filter: {languages.map((language) => LANGUAGES[language]).join(', ')}.{' '}
          {outside === 1 ? '1 of them is' : `${outside} of them are`} in other languages.{' '}
          <Link href="/contribute/settings#work" prefetch={false} className="text-link hover:underline">
            Change
          </Link>
        </p>
      ) : null}
    </section>
  );
}
