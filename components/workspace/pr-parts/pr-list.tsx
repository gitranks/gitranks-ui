'use client';

import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { EnterKey } from '@/components/workspace/masked-issue/facts';
import { useEnterKey } from '@/components/workspace/masked-issue/use-enter-key';
import { RefChips } from '@/components/workspace/ref-chips';
import { cn } from '@/lib/utils';
import { pullRequestPath, WORKSPACE_ANCHORS } from '@/lib/workspace/paths';
import { EMPTY_LIST, ENDED_PAGE, groupsOf, limitLineOf, rowWordsOf } from '@/lib/workspace/pull-request-list';
import type {
  LearnIssueLesson,
  PullRequestList,
  PullRequestListMark,
  PullRequestListRow,
} from '@/lib/workspace/pull-request-page.types';

/** A row's mark: a violet dot, a ring around it while an agent works, a grey dot, a green check for a merge. */
function Mark({ mark, removed }: { mark: PullRequestListMark | null; removed: boolean }) {
  if (mark === 'MERGED' && !removed) {
    return (
      <span className="inline-flex text-positive" data-mark="MERGED">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (!mark && !removed) return null;
  const dot = 'size-2 shrink-0 rounded-full';
  if (removed || mark === 'MAINTAINERS' || mark === 'MERGED') {
    return (
      <span aria-hidden="true" className={cn(dot, 'bg-muted-foreground')} data-mark={removed ? 'REMOVED' : mark} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        dot,
        'bg-primary',
        mark === 'AGENT_WORKING' && 'shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_22%,transparent)]',
      )}
      data-mark={mark}
    />
  );
}

export type PullRequestListRowProps = {
  row: PullRequestListRow;
  now: Date;
  /** The first row of the page: its button is the filled one, with the Enter key. */
  primary?: boolean;
  /** The lesson's page; the lesson is plain text without it. */
  lessonHrefOf?: (lesson: LearnIssueLesson) => Route;
};

/**
 * One fix: the project and its links, the title, one line on where it stands in the words of its own page with its
 * mark, then the facts worth having (the agent, the cost of a hosted run, the lesson) and one button that says what
 * opening it does. A fix whose public page was removed keeps its row, its title no longer a link.
 */
export function PullRequestListRowView({ row, now, primary = false, lessonHrefOf }: PullRequestListRowProps) {
  const words = rowWordsOf(row, now);
  const href = pullRequestPath({ repo: row.repo, issue: row.issueNumber });
  const button = useRef<HTMLAnchorElement>(null);
  useEnterKey(primary && !row.pageRemoved ? () => button.current?.click() : null);
  const removed = row.pageRemoved;
  return (
    <article
      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
      data-pr-row={row.attemptId}
      data-row-box={row.box}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <RefChips
          repo={row.repo}
          issue={row.issueNumber}
          pr={row.number !== null ? { number: row.number, url: row.url } : null}
        />
        {removed ? (
          <span className="font-semibold text-pretty text-muted-foreground">{row.title}</span>
        ) : (
          <Link href={href} prefetch={false} className="font-semibold text-pretty text-foreground hover:underline">
            {row.title}
          </Link>
        )}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span
            className={cn('flex items-center gap-2 font-medium', removed ? 'text-muted-foreground' : 'text-foreground')}
            data-row-line=""
          >
            <Mark mark={row.mark} removed={removed} />
            {words.line}
          </span>
          {row.mark === 'NEEDS_YOU' ? (
            <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
              Needs you
            </span>
          ) : null}
          {words.when ? <span className="text-muted-foreground">{words.when}</span> : null}
          {removed ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
              Page removed
            </span>
          ) : null}
          {words.agent || words.cost ? (
            <span className="text-muted-foreground" data-row-agent="">
              {[words.agent, words.cost].filter(Boolean).join(' · ')}
            </span>
          ) : null}
          {row.lesson && !removed ? (
            <span className="text-muted-foreground" data-row-lesson="">
              Uses{' '}
              {lessonHrefOf ? (
                <Link
                  href={lessonHrefOf(row.lesson)}
                  prefetch={false}
                  className="font-medium text-foreground hover:underline"
                >
                  {row.lesson.title}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{row.lesson.title}</span>
              )}
              .
            </span>
          ) : null}
        </span>
      </div>
      {removed ? null : (
        <div className="flex flex-none items-center gap-1 max-sm:[&>*]:flex-1">
          <Button
            asChild
            variant={primary ? 'default' : 'outline'}
            className={primary ? 'h-10 px-6 font-semibold max-sm:min-h-11' : 'h-9 px-4 max-sm:min-h-11'}
          >
            <Link ref={button} href={href} prefetch={false} aria-label={`${words.button}: ${row.title}`}>
              {words.button}
              {primary ? <EnterKey /> : null}
            </Link>
          </Button>
        </div>
      )}
    </article>
  );
}

export type PullRequestListViewProps = {
  list: PullRequestList;
  now: Date;
  /** The bar the person came from: the empty page's words and where its button leads. */
  side: 'learn' | 'contribute';
  /** The issues of that side, for the empty page. */
  issuesHref: Route;
  lessonHrefOf?: (lesson: LearnIssueLesson) => Route;
  /** "Show 20 more" of "Ended"; the page reads the next 20 from `list.more` and adds them in place. */
  onMore?: (after: string) => void;
  /** The next 20 are being read. */
  loadingMore?: boolean;
};

/**
 * A person's pull requests, one page for Learn and Contribute: the line about the limit at the top, then three groups
 * by who has to act ("Needs you", "In progress", "Ended"), a group with nothing in it left out with its heading. A fix
 * is in the list once. Only the first row of the page has the filled button and the Enter key. "Ended" is newest first
 * and shows 20 more at a time, in place. With no fix at all the page is one box that leads to the issues.
 */
export function PullRequestListView({
  list,
  now,
  side,
  issuesHref,
  lessonHrefOf,
  onMore,
  loadingMore = false,
}: PullRequestListViewProps) {
  const groups = groupsOf(list.rows);
  const first = groups[0]?.rows[0]?.attemptId ?? null;
  const empty = EMPTY_LIST[side];
  return (
    <div className="flex flex-col gap-7" data-pr-list="">
      <h1 className="sr-only">Your pull requests</h1>
      {groups.length ? (
        <>
          <p className="m-0 text-sm text-muted-foreground" data-limit-line={list.atLimit ? 'at-limit' : 'below'}>
            <span className={cn(list.atLimit && 'rounded-md bg-warning-soft px-2 py-1 text-warning-soft-foreground')}>
              {limitLineOf(list)}
            </span>
            {list.atLimit ? ' ' : ' · '}
            <Link
              className="font-semibold text-link hover:underline"
              href={WORKSPACE_ANCHORS.limitRow}
              prefetch={false}
            >
              Change in Settings
            </Link>
          </p>
          {groups.map((group) => (
            <section
              key={group.group}
              className="flex flex-col gap-2.5"
              aria-labelledby={`group-${group.group}`}
              data-group={group.group}
            >
              <h2
                id={`group-${group.group}`}
                className="m-0 flex items-baseline gap-2 text-lg font-semibold tracking-tight"
              >
                {group.title}
                {group.group === 'ENDED' ? null : (
                  <span className="font-mono text-sm font-medium text-muted-foreground tabular-nums">
                    {group.rows.length}
                  </span>
                )}
              </h2>
              <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
                {group.rows.map((row) => (
                  <li key={row.attemptId}>
                    <PullRequestListRowView
                      row={row}
                      now={now}
                      primary={row.attemptId === first}
                      lessonHrefOf={lessonHrefOf}
                    />
                  </li>
                ))}
              </ul>
              {group.group === 'ENDED' && list.more && onMore ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 self-start px-4 max-sm:min-h-11"
                  disabled={loadingMore}
                  onClick={() => list.more && onMore(list.more)}
                >
                  {loadingMore ? 'Showing more…' : `Show ${ENDED_PAGE} more`}
                </Button>
              ) : null}
            </section>
          ))}
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6" data-pr-empty={side}>
          <h2 className="m-0 text-lg font-semibold">{empty.title}</h2>
          <p className="m-0 max-w-[60ch] text-sm text-muted-foreground">{empty.text}</p>
          <Button asChild className="h-10 px-6 font-semibold max-sm:min-h-11">
            <Link href={issuesHref} prefetch={false}>
              {empty.button}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
