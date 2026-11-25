'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useRef, useState, useTransition } from 'react';

import { OtherIssuesDivider, SetIssuesHeading, SetOnlyEmpty } from '@/app/contribute/components/issues-mode';
import { LiveAnnouncer, LiveRowItem, liveOf, useLiveFeed } from '@/app/contribute/components/live-issues';
import { StillRanking } from '@/app/contribute/components/still-ranking';
import { Button } from '@/components/ui/button';
import { IssueRow } from '@/components/workspace/issue-row';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { ShowMore } from '@/components/workspace/show-more';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { ISSUES_PAGE_SIZE } from '@/lib/contribute/live-issues';
import { tiersOf } from '@/lib/contribute/set-format';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import type { ContributeSource } from '@/lib/workspace/click-tracking';
import type {
  ContributeIssue,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeLanguage,
  ContributeSet,
} from '@/lib/workspace/contribute.types';
import { type ConnectedAgents, issueRowOfContribute } from '@/lib/workspace/issue-row';
import type { LimitCounts } from '@/lib/workspace/limit-words';
import { type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { IssueStartFacts } from '@/lib/workspace/start-refusals';

const link = 'font-semibold text-link hover:underline';
/** The issues fetched once, for any list of issues: what a person works on is changed in Settings. */
const NO_FILTER: ContributeIssuesFilter = {};

/** Nothing fits what the person works on: in words, and the way to change it. */
export const NONE_FITS = {
  title: 'No open issue fits what you work on right now',
  text: 'New issues are checked every hour. Adding a language lets more of them fit.',
} as const;

/** A state of the list in place of its rows: one title, one line, one next step. */
function ListNote({ title, children, name }: { title: string; children?: ReactNode; name: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center" data-list-note={name}>
      <span className="font-semibold">{title}</span>
      {children ? <span className="text-sm text-muted-foreground">{children}</span> : null}
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
  /** GitRanks holds the account: no issues, no Start. */
  held?: boolean;
  /** A fair-use rule holds the account: its message's answer page, the held note's one next step. */
  heldAnswerHref?: Route;
  /** At the open pull request limit: its notice over the rows, which have no Start. */
  limit?: LimitCounts | null;
  /** What the person works on: their list's issues apart from the others, and why a list-only mode is empty. */
  set?: ContributeSet | null;
  languages?: ContributeLanguage[];
  /** For a refused hosted Start's words. */
  facts?: IssueStartFacts;
  /** The mark on each row's Start, where the page counts its Starts. */
  source?: ContributeSource;
  /**
   * What the list says when nothing matches what the person works on, with "Change what you work on"; left out, the
   * home's words and the button "What you work on".
   */
  noneTitle?: string;
  /** For masked rows: the day's full issues and the numbers of a night. */
  masked?: MaskedListReads;
  className?: string;
};

/**
 * Contribute's issues for the person, without the tab's head: the list's own notices (the account held, the limit),
 * then the rows, live (a taken or started row leaves and the next one fills its place), and "Show 10 more". Or why there are none, each with one next step. A page that places the list outside the tabs gets
 * the same notices.
 */
export function ContributeIssueList({
  page,
  agents,
  menu = true,
  held = false,
  heldAnswerHref,
  limit = null,
  set,
  languages = [],
  facts,
  source,
  noneTitle,
  masked = NO_MASKED_READS,
  className,
}: ContributeIssueListProps) {
  const router = useRouter();
  let body: ReactNode;
  // Held: the API answers an empty page that is never ranked; nothing is shown and nothing reads it again.
  if (held) {
    body = (
      <ListNote name="held" title="No issues for now">
        Contribute is paused for this account, so no issues are shown.{' '}
        {heldAnswerHref ? (
          <Link href={heldAnswerHref} prefetch={false} className={link}>
            Answer
          </Link>
        ) : (
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            Write to us
          </a>
        )}
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
  } else if (page && !page.computedAt && !page.items.length) {
    // The first picks are computed after the first way in: the page reads itself again until they are in.
    body = <StillRanking />;
  } else {
    body = (
      <LiveRows
        page={page}
        agents={agents}
        menu={menu}
        limit={limit}
        set={set}
        languages={languages}
        facts={facts}
        source={source}
        noneTitle={noneTitle}
        masked={masked}
        onLimitReached={() => router.refresh()}
      />
    );
  }
  return (
    <div className={cn('flex flex-col gap-4', className)} data-issue-list="">
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
  limit,
  set,
  languages,
  facts,
  source,
  noneTitle,
  masked,
  onLimitReached,
}: Required<Pick<ContributeIssueListProps, 'agents' | 'menu' | 'languages' | 'masked'>> & {
  noneTitle?: string;
  page: ContributeIssuePage | null;
  limit: LimitCounts | null;
  set?: ContributeSet | null;
  facts?: IssueStartFacts;
  source?: ContributeSource;
  onLimitReached: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { feed, snapshot } = useLiveFeed(
    page ?? { items: [], total: 0, next: null },
    ISSUES_PAGE_SIZE,
    NO_FILTER,
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
  const first = snapshot.rows.find(({ issue }) => !issue.masked)?.issue.issueId;
  const anyMasked = snapshot.rows.some(({ issue }) => issue.masked);
  // The foot stays once the last masked row folded, so the line on why it left is still read.
  const [hadMasked, setHadMasked] = useState(anyMasked);
  if (anyMasked && !hadMasked) setHadMasked(true);

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
              {row.issue.masked ? (
                // An issue with its details hidden: its masked row, which leaves the feed when it is gone.
                <MaskedListRow issue={row.issue.masked} onLeave={() => feed.fold(issueId)} />
              ) : (
                <IssueRow
                  issue={issueRowOfContribute(row.issue)}
                  side="contribute"
                  agents={agents}
                  primary={issueId === first}
                  control={!limit}
                  menu={menu}
                  live={liveOf(feed, row)}
                  facts={facts}
                  startSource={source}
                  onRefused={(refusal) => {
                    // The limit holds now: the page reads it again and shows its state.
                    if (refusal.code === 'LIMIT_REACHED') onLimitReached();
                  }}
                />
              )}
            </LiveRowItem>
          );
        })}
      </ul>
    ) : null;

  let empty: ReactNode = null;
  if (!snapshot.rows.length && !snapshot.next) {
    if (set && set.mode !== 'ALL' && setOnly(set)) {
      empty = <SetOnlyEmpty set={set as ContributeSet & { mode: 'STACK' | 'REPOS' }} languages={languages} />;
    } else if (!noneTitle) {
      empty = (
        <ListNote name="none" title={NONE_FITS.title}>
          <span className="flex flex-col items-center gap-3">
            {NONE_FITS.text}
            <Button asChild variant="outline" className="h-9 px-4 max-sm:min-h-11">
              <Link href={WORKSPACE_PATHS.settingsWork} prefetch={false}>
                What you work on
              </Link>
            </Button>
          </span>
        </ListNote>
      );
    } else {
      empty = (
        <ListNote name="none" title={noneTitle}>
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
        <MaskedList from="contribute" pageFrom="contribute" reads={masked} foot={hadMasked} className="gap-4">
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
          {/* Only while there is more to show: none at the end, whatever the total says. */}
          {snapshot.more ? (
            <ShowMore
              shown={snapshot.rows.length}
              total={Math.max(snapshot.total, snapshot.rows.length + 1)}
              noun="issue"
              pending={growing}
              onMore={() => startGrowing(() => feed.grow(ISSUES_PAGE_SIZE))}
            />
          ) : null}
        </MaskedList>
      </div>
    </IssueStartsProvider>
  );
}
