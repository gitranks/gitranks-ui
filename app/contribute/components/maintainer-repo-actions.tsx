'use client';

import { useState, useTransition } from 'react';

import { undoPrAction } from '../maintainers/actions';
import { Button } from '@/components/ui/button';
import type {
  ContributeBlockedContributor,
  ContributeMaintainerRepo,
  ContributePrAction,
  ContributeStoppedPr,
} from '@/lib/contribute/contribute.types';
import { type PrFeedbackErrorCode, prFeedbackErrorMessage } from '@/lib/contribute/errors';
import { fullDayLabel } from '@/lib/contribute/maintainers-format';
import { prUrlOf } from '@/lib/contribute/pr-feedback';

type Row = { key: string; feedbackId: string; kind: ContributePrAction; label: string; since: string; by: string };

const rowsOf = (blocked: ContributeBlockedContributor[], stopped: ContributeStoppedPr[]) => ({
  blocked: blocked.map(
    (item): Row => ({
      key: `b-${item.feedbackId}`,
      feedbackId: item.feedbackId,
      kind: 'BLOCK_CONTRIBUTOR',
      label: item.login ?? 'A contributor who left',
      since: item.since,
      by: item.by,
    }),
  ),
  stopped: stopped.map(
    (item): Row => ({
      key: `s-${item.feedbackId}-${item.number}`,
      feedbackId: item.feedbackId,
      kind: 'STOP_PR',
      label: `#${item.number}`,
      since: item.since,
      by: item.by,
    }),
  ),
});

/**
 * A repository's blocked contributors and stopped PRs on "Your repos", each with its Undo. Nothing when it has
 * neither.
 */
export function MaintainerRepoActions({ repo }: { repo: ContributeMaintainerRepo }) {
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<PrFeedbackErrorCode | null>(null);
  const [pending, startTransition] = useTransition();
  const rows = rowsOf(repo.blockedContributors ?? [], repo.stoppedPrs ?? []);
  const blocked = rows.blocked.filter(({ key }) => !gone.has(key));
  const stopped = rows.stopped.filter(({ key }) => !gone.has(key));
  if (!blocked.length && !stopped.length && !error) return null;

  const undo = (row: Row) =>
    startTransition(async () => {
      setError(null);
      const result = await undoPrAction({ feedbackId: row.feedbackId, repoId: repo.repoId, kind: row.kind });
      if (result.ok) setGone((current) => new Set(current).add(row.key));
      else setError(result.error);
    });

  const list = (title: string, items: Row[], link: (row: Row) => string | null) =>
    items.length ? (
      <div className="flex flex-col gap-1.5" data-repo-list={title}>
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <ul className="flex flex-col gap-1">
          {items.map((row) => {
            const href = link(row);
            return (
              <li key={row.key} className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                <span className="min-w-0">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono hover:underline">
                      {row.label}
                    </a>
                  ) : (
                    <span className="font-mono">{row.label}</span>
                  )}{' '}
                  <span className="text-muted-foreground">
                    · since {fullDayLabel(row.since)} · by {row.by}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-11 p-0 text-link sm:min-h-0"
                  disabled={pending}
                  onClick={() => undo(row)}
                >
                  Undo
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <div data-repo-actions={repo.repoId} className="ml-3 flex flex-col gap-3 border-l pl-4">
      {list('Blocked contributors', blocked, () => null)}
      {list('Stopped PRs', stopped, (row) =>
        prUrlOf({ nameWithOwner: repo.nameWithOwner, number: Number(row.label.slice(1)) }),
      )}
      {error ? (
        <p role="alert" data-error={error} className="text-sm text-destructive">
          {prFeedbackErrorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}
