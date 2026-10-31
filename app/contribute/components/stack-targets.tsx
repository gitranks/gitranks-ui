'use client';

import { useState, useTransition } from 'react';

import { ignoreContributeRepo, resolveContributeStack } from '../actions';
import type { FeedbackOpen } from './feedback-dialog';
import { Pill } from './primitives';
import type { SetWrite } from './set-section';
import { Button } from '@/components/ui/button';
import type { ContributeSet, ContributeStackTarget } from '@/lib/contribute/contribute.types';
import { relativeLabel } from '@/lib/contribute/format';
import { starsLabel } from '@/lib/contribute/maintainers-format';
import { plural, reasonsText, statusOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

/** Libraries shown before "Show all". */
const TARGET_ROWS = 10;
/** Package names a library's row names. */
const PACKAGES_SHOWN = 3;

/** The libraries the stack's repos use, worked out for the user: read-only, each one can be ignored. */
export function StackTargets({
  set,
  write,
  onFeedback,
  now,
}: {
  set: ContributeSet;
  write: SetWrite;
  onFeedback: (open: FeedbackOpen) => void;
  now?: Date;
}) {
  const [all, setAll] = useState(false);
  const resolve = set.stack.resolve;
  const targets = resolve?.targets ?? [];
  const counted = targets.filter(({ status }) => status !== 'UNSUPPORTED');
  const unsupported = targets.filter(({ status }) => status === 'UNSUPPORTED');
  const ignoreFull = set.ignore.length >= set.limits.ignore;
  const shown = all ? counted : counted.slice(0, TARGET_ROWS);

  return (
    <div className="flex flex-col gap-3 border-t pt-4" data-targets={resolve?.state ?? 'none'}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">Libraries we&apos;ll work on</h3>
          <p className="text-xs text-muted-foreground">
            {resolve ? (
              <>
                <span className="text-foreground">{plural(resolve.packages, 'package')}</span> in your sources → the{' '}
                <span className="text-foreground">{counted.length}</span>{' '}
                {counted.length === 1 ? 'library' : 'libraries'} most of them use. Worked out for you; ignore any you
                don&apos;t want.
              </>
            ) : set.stack.count ? (
              'We work out the libraries your sources use as soon as they are read.'
            ) : (
              "Add your repos above, and we'll work out the libraries they use."
            )}
          </p>
        </div>
        <ResolveState set={set} write={write} now={now} />
      </div>

      {shown.length ? (
        <ol className="divide-y overflow-hidden rounded-xl border">
          {shown.map((target, index) => (
            <TargetRow
              key={target.repositoryId}
              target={target}
              rank={index + 1}
              ignoreFull={ignoreFull}
              ignoreCap={set.limits.ignore}
              write={write}
            />
          ))}
          {counted.length > shown.length ? (
            <li className="px-4 py-2">
              <button type="button" onClick={() => setAll(true)} className="text-xs text-link hover:underline">
                Show all {counted.length}
              </button>
            </li>
          ) : null}
        </ol>
      ) : null}

      {resolve && (resolve.failed.length || unsupported.length || resolve.unlinked) ? (
        <div className="flex flex-col gap-1.5 text-sm">
          {resolve.failed.length ? (
            <details className="rounded-lg border px-4 py-2.5" data-group="failed">
              <summary className="cursor-pointer text-sm">
                <span className="font-medium">Didn&apos;t pass the rules</span>{' '}
                <span className="text-muted-foreground">· {resolve.failed.length}</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                {resolve.failed.map((repo) => (
                  <li key={repo.repositoryId} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono break-all">{repo.nameWithOwner}</span>
                    <span className="text-muted-foreground">used by {repo.usage}</span>
                    <Pill>{reasonsText(repo.reasons)}</Pill>
                    <button
                      type="button"
                      className="text-link hover:underline"
                      onClick={() =>
                        onFeedback({
                          topic: 'GATES',
                          context: { mode: 'STACK', repo: repo.nameWithOwner, reasons: repo.reasons },
                        })
                      }
                    >
                      Suggest a change
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {unsupported.length ? (
            <details className="rounded-lg border px-4 py-2.5" data-group="unsupported">
              <summary className="cursor-pointer text-sm">
                <span className="font-medium">Language not supported yet</span>{' '}
                <span className="text-muted-foreground">· {unsupported.length}</span>
              </summary>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                {unsupported.map((repo) => (
                  <li key={repo.repositoryId} className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span className="font-mono break-all">{repo.nameWithOwner}</span>
                    <span>used by {repo.usage}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {resolve.unlinked ? (
            <p className="px-1 text-xs text-muted-foreground">
              {resolve.unlinked === 1
                ? "1 package has no GitHub repo linked, so we can't follow it."
                : `${resolve.unlinked.toLocaleString('en-US')} packages have no GitHub repo linked, so we can't follow them.`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Where working out the libraries stands, with Refresh, or Try again after a failure. */
function ResolveState({ set, write, now }: { set: ContributeSet; write: SetWrite; now?: Date }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resolve = set.stack.resolve;
  if (!resolve && !set.stack.count) return null;

  const run = () =>
    startTransition(async () => {
      setError(await write(() => resolveContributeStack(), 'resolve'));
    });

  const state = resolve?.state;
  const [dot, label] =
    state === 'RESOLVING'
      ? ['bg-warning', `Working out your libraries… started ${relativeLabel(resolve?.startedAt, now)}`]
      : state === 'FAILED'
        ? ['bg-negative', "Couldn't update them: showing the last ones"]
        : state === 'READY'
          ? ['bg-positive', `Updated ${relativeLabel(resolve?.endedAt ?? resolve?.startedAt, now)}`]
          : ['bg-muted-foreground', 'Not worked out yet'];

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', dot)} />
        <span role="status">{label}</span>
        {state === 'RESOLVING' ? null : (
          <Button type="button" variant="ghost" size="sm" onClick={run} disabled={pending}>
            {pending ? 'Starting…' : state === 'FAILED' ? 'Try again' : 'Refresh'}
          </Button>
        )}
      </span>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** One library: its place, how many of the user's repos use it, which packages, stars, status and Ignore. */
function TargetRow({
  target,
  rank,
  ignoreFull,
  ignoreCap,
  write,
}: {
  target: ContributeStackTarget;
  rank: number;
  ignoreFull: boolean;
  ignoreCap: number;
  write: SetWrite;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = statusOf(target, 'work');
  const extra = target.packages.length - PACKAGES_SHOWN;

  const ignore = () =>
    startTransition(async () => {
      setError(await write(() => ignoreContributeRepo(target.repositoryId), 'ignore'));
    });

  return (
    <li
      data-repo={target.nameWithOwner}
      data-status={target.status}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
    >
      <span className="w-6 font-mono text-xs text-muted-foreground">{rank}</span>
      <a
        href={`https://github.com/${target.nameWithOwner}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 font-mono text-[13px] break-all hover:underline"
      >
        {target.nameWithOwner}
      </a>
      <Pill tone="violet">used by {target.usage}</Pill>
      {target.packages.length ? (
        <span className="min-w-0 text-xs break-all text-muted-foreground">
          {target.packages.slice(0, PACKAGES_SHOWN).join(', ')}
          {extra > 0 ? `, +${extra}` : ''}
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">
        <span aria-hidden="true">★</span>
        <span className="sr-only">Stars:</span> {starsLabel(target.stars)}
      </span>
      <Pill tone={status.tone}>{status.label}</Pill>
      <span className="ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || ignoreFull}
          title={ignoreFull ? `Your ignore list is full (${ignoreCap}): unignore a repo first` : undefined}
          onClick={ignore}
          aria-label={`Ignore ${target.nameWithOwner}`}
        >
          Ignore
        </Button>
      </span>
      {error ? (
        <span role="alert" className="basis-full text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </li>
  );
}
