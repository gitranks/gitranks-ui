'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useRef, useState, useTransition } from 'react';

import { filterOf, type IssuesQuery, isFiltered } from '@/app/contribute/components/issues-filter';
import { OtherIssuesDivider, SetIssuesHeading, SetOnlyEmpty } from '@/app/contribute/components/issues-mode';
import { DailyCapEnd, LiveAnnouncer, LiveRowItem, liveOf, useLiveFeed } from '@/app/contribute/components/live-issues';
import { StillRanking } from '@/app/contribute/components/still-ranking';
import { Button } from '@/components/ui/button';
import { IssueRow } from '@/components/workspace/issue-row';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { ShowMore } from '@/components/workspace/show-more';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { ISSUES_PAGE_SIZE } from '@/lib/contribute/live-issues';
import { tiersOf } from '@/lib/contribute/set-format';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import { resumeContributing } from '@/lib/workspace/actions';
import type {
  ContributeIssue,
  ContributeIssuePage,
  ContributeLanguage,
  ContributeSet,
} from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { type ConnectedAgents, issueRowOfContribute } from '@/lib/workspace/issue-row';
import type { LimitCounts } from '@/lib/workspace/limit-words';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { IssueStartFacts } from '@/lib/workspace/start-refusals';

const link = 'font-semibold text-link hover:underline';
const NO_QUERY: IssuesQuery = {};

/** A state of the list in place of its rows: one title, one line, one next step. */
function ListNote({ title, children, name }: { title: string; children?: ReactNode; name: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center" data-list-note={name}>
      <span className="font-semibold">{title}</span>
      {children ? <span className="text-sm text-muted-foreground">{children}</span> : null}
    </div>
  );
}

/** "Contributing is paused" over the rows, with Resume: the list as it was last computed stays under it. */
function PausedNotice() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resume = () => {
    if (pending) return;
    startTransition(async () => {
      setError(null);
      const result = await resumeContributing().catch(() => null);
      if (result?.ok) router.refresh();
      else setError(contributeErrorMessage(result?.error ?? 'FAILED', result?.message));
    });
  };
  return (
    <div
      role="status"
      data-list-note="paused"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
    >
      <p className="max-w-prose text-sm font-medium">Contributing is paused, so your agent can&apos;t take an issue.</p>
      <Button
        type="button"
        onClick={resume}
        aria-disabled={pending || undefined}
        className="min-h-11 px-5 font-semibold max-sm:w-full sm:min-h-10 aria-disabled:opacity-60"
      >
        {pending ? 'Resuming…' : 'Resume'}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type ContributeIssueListProps = {
  /** The first page; `undefined` when the API did not answer it, null when it has none for the user. */
  page: ContributeIssuePage | null | undefined;
  /** The agents connected now (the gate's). */
  agents: ConnectedAgents;
  /** The rows' "⋯": false leaves it out. */
  menu?: boolean;
  /** The filters in the address. */
  filter?: IssuesQuery;
  /** Learn is open to the person: "Fix it and teach me" in the rows' menu. */
  learnOpen?: boolean;
  /** GitRanks holds the account: no issues, no Start. */
  held?: boolean;
  /** The person paused contributing: the notice and Resume over the rows. */
  pausedByYou?: boolean;
  /** At the open pull request limit: its notice over the rows, which have no Start. */
  limit?: LimitCounts | null;
  /** What the person works on: their list's issues apart from the others, and why a list-only mode is empty. */
  set?: ContributeSet | null;
  languages?: ContributeLanguage[];
  /** For a refused hosted Start's words. */
  facts?: IssueStartFacts;
  /** The rows' Start leads to the Start page from a page outside the tabs too. */
  className?: string;
};

/**
 * Contribute's issues for the person, without the tab's head: the list's own notices (the account held, the pause
 * with Resume, the limit), then the rows, live (a taken or started row leaves and the next one fills its place), and
 * "Show 10 more". Or why there are none, each with one next step. A page that places the list outside the tabs gets
 * the same notices.
 */
export function ContributeIssueList({
  page,
  agents,
  menu = true,
  filter = NO_QUERY,
  learnOpen = false,
  held = false,
  pausedByYou = false,
  limit = null,
  set,
  languages = [],
  facts,
  className,
}: ContributeIssueListProps) {
  const router = useRouter();
  let body: ReactNode;
  // Held: the API answers an empty page that is never ranked; nothing is shown and nothing reads it again.
  if (held) {
    body = (
      <ListNote name="held" title="No issues for now">
        Contribute is paused for this account, so no issues are shown.{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
          Write to us
        </a>
      </ListNote>
    );
  } else if (page === undefined) {
    body = (
      <ListNote name="unanswered" title="Issues are not available right now. Try again in a minute.">
        <Button
          type="button"
          variant="link"
          onClick={() => router.refresh()}
          className="h-auto p-0 font-semibold text-link"
        >
          Try again
        </Button>
      </ListNote>
    );
  } else if (page && !page.computedAt && !page.items.length && !isFiltered(filter)) {
    // The first picks are computed after the first way in: the page reads itself again until they are in.
    body = <StillRanking />;
  } else {
    body = (
      <LiveRows
        page={page}
        agents={agents}
        menu={menu}
        filter={filter}
        learnOpen={learnOpen}
        limit={limit}
        set={set}
        languages={languages}
        facts={facts}
        onLimitReached={() => router.refresh()}
      />
    );
  }
  return (
    <div className={cn('flex flex-col gap-4', className)} data-issue-list="">
      {held ? null : pausedByYou ? <PausedNotice /> : null}
      {held || !limit ? null : <LimitNotice {...limit} />}
      {body}
    </div>
  );
}

/** The user's mode works on its own list alone, and waits when it has nothing ready. */
const setOnly = (set: ContributeSet) => (set.mode === 'STACK' ? set.stack.fallback : set.repos.fallback) === 'SET_ONLY';

function LiveRows({
  page,
  agents,
  menu,
  filter,
  learnOpen,
  limit,
  set,
  languages,
  facts,
  onLimitReached,
}: Required<Pick<ContributeIssueListProps, 'agents' | 'menu' | 'filter' | 'learnOpen' | 'languages'>> & {
  page: ContributeIssuePage | null;
  limit: LimitCounts | null;
  set?: ContributeSet | null;
  facts?: IssueStartFacts;
  onLimitReached: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { feed, snapshot } = useLiveFeed(
    page ?? { items: [], total: 0, next: null },
    ISSUES_PAGE_SIZE,
    filterOf(filter),
    root,
  );
  const [growing, startGrowing] = useTransition();
  const byId = new Map(snapshot.rows.map((row) => [row.issue.issueId, row]));
  const split = set
    ? tiersOf(
        snapshot.rows.map(({ issue }) => issue),
        set.mode,
      )
    : null;
  // The cap ends the list: only once no page is left to read.
  const capped = snapshot.dailyCap?.reached && !snapshot.next ? snapshot.dailyCap : null;
  const first = snapshot.rows[0]?.issue.issueId;

  const rowsOf = (issues: ContributeIssue[], other = false) =>
    issues.length ? (
      <ul
        data-other={other || undefined}
        className={cn('divide-y overflow-hidden rounded-xl border bg-card', other && 'border-dashed')}
      >
        {issues.map(({ issueId }) => {
          const row = byId.get(issueId);
          if (!row) return null;
          return (
            <LiveRowItem key={issueId} row={row}>
              <IssueRow
                issue={issueRowOfContribute(row.issue)}
                side="contribute"
                agents={agents}
                primary={issueId === first}
                control={!limit}
                menu={menu}
                learnOpen={learnOpen}
                live={liveOf(feed, row)}
                facts={facts}
                onRefused={(refusal) => {
                  // The limit holds now: the page reads it again and shows its state.
                  if (refusal.code === 'LIMIT_REACHED') onLimitReached();
                }}
              />
            </LiveRowItem>
          );
        })}
      </ul>
    ) : null;

  let empty: ReactNode = null;
  if (!snapshot.rows.length && !snapshot.next && !capped) {
    if (set && set.mode !== 'ALL' && setOnly(set) && !isFiltered(filter)) {
      empty = <SetOnlyEmpty set={set as ContributeSet & { mode: 'STACK' | 'REPOS' }} languages={languages} />;
    } else if (isFiltered(filter)) {
      empty = (
        <ListNote name="filtered" title="No issues match these filters">
          <Link href={'/contribute#issues' as Route} prefetch={false} scroll={false} className={link}>
            Clear the filters
          </Link>
        </ListNote>
      );
    } else {
      empty = (
        <ListNote name="none" title="No issues match what you work on. New picks arrive every day.">
          <Link href={WORKSPACE_PATHS.settingsWork} prefetch={false} className={link}>
            Change what you work on
          </Link>
        </ListNote>
      );
    }
  }

  return (
    <IssueStartsProvider>
      <div ref={root} tabIndex={-1} className="flex flex-col gap-4 outline-none">
        <LiveAnnouncer rows={snapshot.rows} />
        {empty}
        {split && set ? (
          <>
            {split.set.length ? <SetIssuesHeading set={set} /> : null}
            {rowsOf(split.set)}
            {split.other.length ? <OtherIssuesDivider set={set} none={!split.set.length} /> : null}
            {rowsOf(split.other, true)}
          </>
        ) : (
          rowsOf(snapshot.rows.map(({ issue }) => issue))
        )}
        {capped ? <DailyCapEnd cap={capped} /> : null}
        <ShowMore
          shown={snapshot.rows.length}
          total={snapshot.total}
          noun="issue"
          pending={growing}
          onMore={() => startGrowing(() => feed.grow(ISSUES_PAGE_SIZE))}
        />
      </div>
    </IssueStartsProvider>
  );
}
