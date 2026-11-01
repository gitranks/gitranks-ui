'use client';

import { useState, useTransition } from 'react';

import { optInMaintainerRepos, optOutMaintainerRepos, signInAsMaintainer } from '../maintainers/actions';
import { PanelTitle, Pill } from './primitives';
import { StarCount } from '@/components/star-count/star-count';
import { Button } from '@/components/ui/button';
import type { ContributeMaintainerRepo, ContributeOptOutResult } from '@/lib/contribute/contribute.types';
import { type MaintainerErrorCode, maintainerErrorMessage } from '@/lib/contribute/errors';
import {
  fullDayLabel,
  type OptOutChange,
  optOutResultText,
  PERMISSIONS,
  withOptOutResults,
} from '@/lib/contribute/maintainers-format';

type Outcome = { change: OptOutChange; results: ContributeOptOutResult[] };

/** The visitor's repositories to opt out or back in, and what the last change did. */
export function MaintainerReposForm({
  title,
  text,
  login,
  repos: listed,
  truncated,
}: {
  title: string;
  text: string;
  login: string;
  repos: ContributeMaintainerRepo[];
  truncated: boolean;
}) {
  const [repos, setRepos] = useState(listed);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<MaintainerErrorCode | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (repoId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });

  const allSelected = repos.length > 0 && selected.size === repos.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(repos.map(({ repoId }) => repoId)));

  const run = (change: OptOutChange) =>
    startTransition(async () => {
      setError(null);
      setOutcome(null);
      const ids = repos.filter(({ repoId }) => selected.has(repoId)).map(({ repoId }) => repoId);
      const result = await (change === 'out' ? optOutMaintainerRepos(ids) : optInMaintainerRepos(ids));
      setRepos((current) => withOptOutResults(current, result.data));
      if (result.data.length) setOutcome({ change, results: result.data });
      if (result.ok) setSelected(new Set());
      else setError(result.error);
    });

  return (
    <>
      <PanelTitle title={title} text={text} />
      <p className="text-sm">
        Signed in on GitHub as <span className="font-mono font-medium">{login}</span>.
      </p>

      {repos.length ? (
        <fieldset className="flex flex-col gap-2" disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Repos you administer or maintain</legend>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {truncated ? (
              <span data-truncated className="text-muted-foreground">
                Showing your {repos.length} most-starred repos.
              </span>
            ) : (
              <span className="text-muted-foreground">
                {repos.length} {repos.length === 1 ? 'repo' : 'repos'}, most stars first.
              </span>
            )}
            <button type="button" onClick={toggleAll} className="font-medium text-link hover:underline">
              {allSelected ? 'Clear selection' : 'Select all'}
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {repos.map((repo) => (
              <li key={repo.repoId}>
                <RepoRow repo={repo} checked={selected.has(repo.repoId)} onToggle={() => toggle(repo.repoId)} />
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => run('out')}
              disabled={pending || !selected.size}
              className="min-h-11 px-5 font-semibold"
            >
              {pending ? 'Saving…' : 'Opt out selected'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => run('in')}
              disabled={pending || !selected.size}
              className="min-h-11"
            >
              Opt back in
            </Button>
          </div>
        </fieldset>
      ) : (
        <p data-empty className="text-sm text-muted-foreground">
          GitHub lists no public repo that this account administers or maintains, so there is nothing to opt out here.
          The file works for any repo you can push to.
        </p>
      )}

      {error ? (
        <div role="alert" data-error={error} className="flex flex-col items-start gap-3">
          <p className="text-sm text-destructive">{maintainerErrorMessage(error)}</p>
          {error === 'SIGNED_OUT' ? (
            <form action={signInAsMaintainer}>
              <Button type="submit" className="min-h-11 px-5 font-semibold">
                Sign in again
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {outcome ? <OptOutResults {...outcome} repos={repos} /> : null}
    </>
  );
}

function RepoRow({
  repo,
  checked,
  onToggle,
}: {
  repo: ContributeMaintainerRepo;
  checked: boolean;
  onToggle: () => void;
}) {
  const id = `repo-${repo.repoId}`;
  return (
    <label
      htmlFor={id}
      data-repo={repo.repoId}
      className="flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2.5 hover:bg-accent/40"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="size-4 accent-primary" />
        <span className="truncate font-mono text-sm">{repo.nameWithOwner}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {repo.optedOut ? (
          <Pill tone="amber">{repo.optedOutAt ? `Opted out since ${fullDayLabel(repo.optedOutAt)}` : 'Opted out'}</Pill>
        ) : null}
        {repo.isArchived ? <Pill>Archived</Pill> : null}
        <Pill tone="violet">{PERMISSIONS[repo.permission] ?? repo.permission}</Pill>
        <span className="font-mono" title={`${repo.stars.toLocaleString('en-US')} stars`}>
          ★ <StarCount stars={repo.stars} format="compact" />
        </span>
      </span>
    </label>
  );
}

/** Each repository the last change asked about, and what happened to it. */
export function OptOutResults({
  change,
  results,
  repos,
}: Outcome & { repos: Pick<ContributeMaintainerRepo, 'repoId' | 'nameWithOwner'>[] }) {
  const names = new Map(repos.map(({ repoId, nameWithOwner }) => [repoId, nameWithOwner]));
  const changed = results.filter(({ reason }) => !reason).length;
  return (
    <div role="status" data-results={change} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4">
      <p className="text-sm font-medium">
        {change === 'out' ? 'Opted out' : 'Opted back in'}: {changed} of {results.length}
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {results.map((result) => (
          <li key={result.repoId} data-result={result.reason ?? 'CHANGED'} className="flex flex-col">
            <span className="font-mono">{result.nameWithOwner ?? names.get(result.repoId) ?? 'A repo'}</span>
            <span className={result.reason ? 'text-destructive' : 'text-muted-foreground'}>
              {optOutResultText(result, change)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
