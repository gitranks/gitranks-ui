'use client';

import { Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Eyebrow } from '@/components/workspace/primitives';
import { setContributeFallback } from '@/lib/contribute/actions';
import { readingLibrariesOf, setReposOf, setSizeOf, stackPendingOf } from '@/lib/contribute/set-format';
import type { ContributeLanguage, ContributeSet } from '@/lib/workspace/contribute.types';
import { contributeSetErrorMessage } from '@/lib/workspace/errors';
import { LANGUAGES, plural } from '@/lib/workspace/format';
import { SETTINGS_PATHS, settingsPathOf } from '@/lib/workspace/paths';

/** The line above the other issues: the user's list had nothing (more) ready, so these follow it. */
export function OtherIssuesDivider({ set, none }: { set: ContributeSet; none: boolean }) {
  const own = set.mode === 'STACK' ? "your stack's issues" : "your list's issues";
  const workingOut = set.mode === 'STACK' && stackPendingOf(set);
  return (
    <div className="flex flex-col gap-1 pt-3" data-divider="other">
      <div className="flex items-center gap-3">
        <Eyebrow>
          {workingOut
            ? 'Your stack is being worked out: other issues for you'
            : none
              ? 'Your list has nothing ready: other issues for you'
              : 'Other issues for you'}
        </Eyebrow>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <p className="text-xs text-muted-foreground">
        {workingOut
          ? 'Shown until a library of your stack is read.'
          : `Shown ${none ? 'instead of' : 'below'} ${own}, because you chose "Work on all issues meanwhile".`}
        {workingOut ? null : (
          <>
            {' '}
            <Link href={SETTINGS_PATHS.work} prefetch={false} className="text-link hover:underline">
              Change
            </Link>
          </>
        )}
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
  // The stack is still worked out, or its libraries read for the first time: the agent works on all issues meanwhile.
  const workingOut = mode === 'STACK' && stackPendingOf(set);
  const readingLibraries = workingOut ? readingLibrariesOf(set) : 0;

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
          {readingLibraries
            ? "We're reading the libraries your stack uses"
            : workingOut
              ? "We're working out the libraries your stack uses"
              : size
                ? `Your ${things} have no issues ready right now`
                : 'Your list is empty'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {readingLibraries
            ? `We found ${plural(readingLibraries, 'library', 'libraries')} in your ${plural(set.stack.count, 'repo')}, and are reading their issues for the first time. Until one is read, your agent works on all issues, and they show here once picked.`
            : workingOut
              ? `We're reading the dependency files of your ${plural(set.stack.count, 'repo')}. Their libraries' issues show here once they're read. Until then, your agent works on all issues, and they show here once picked.`
              : size
                ? `We check them for new issues every 12 hours.${reading ? ` ${plural(reading, 'repo')} ${reading === 1 ? 'is' : 'are'} still being read for the first time.` : ''} Your agent waits meanwhile.`
                : 'Add repos to it in Settings, or work on all issues meanwhile. Your agent waits until then.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {/* While the stack is worked out, all issues come by themselves. */}
        {workingOut ? null : (
          <Button type="button" onClick={meanwhile} disabled={pending}>
            {pending ? 'Switching…' : 'Work on all issues meanwhile'}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={SETTINGS_PATHS.work} prefetch={false}>
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
          <Link href={settingsPathOf('work')} prefetch={false} className="text-link hover:underline">
            Change
          </Link>
        </p>
      ) : null}
    </section>
  );
}
