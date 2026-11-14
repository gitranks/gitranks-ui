'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { CommentRow } from './comment-row';
import { DraftOpen, ThreadOpen } from './comment-row-open';
import { HEADING, Pill } from './primitives';
import { useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type {
  ContributeAttemptState,
  ContributeFeedbackThread,
  ContributeReplyDraft,
} from '@/lib/contribute/contribute.types';
import { HELD_BACK_REASON } from '@/lib/contribute/contribution-moves';
import { replyBlockOf } from '@/lib/contribute/follow-up-format';
import type { ActionId } from '@/lib/contribute/hard-stop';
import type { OrgAccess } from '@/lib/contribute/org-access';
import { reasonKeyOf, replyTroubleLineOf } from '@/lib/contribute/reply-trouble';
import {
  type CommentGroup,
  type CommentRowItem,
  GROUP_TITLES,
  type GroupId,
  groupsOf,
  ownLinesOf,
  type RowMode,
  type RowState,
  resolveLinesOf,
  rowActionsOf,
  rowStateOf,
  rowTargetOf,
  rowVersionOf,
  SHOWN_BEFORE_MORE,
  summaryOf,
  threadStateOf,
} from '@/lib/contribute/review-comments';

export type ReviewCommentsProps = {
  mode: RowMode;
  drafts?: ContributeReplyDraft[];
  threads?: ContributeFeedbackThread[];
  readAt?: string | null;
  /** The run shown; null for the next step and the first attempt's own list. */
  run?: {
    attemptId: string;
    state: ContributeAttemptState;
    updatedAt: string;
    hasPatch: boolean;
    flow: boolean;
  } | null;
  /** The first attempt, when its own list is shown. */
  first?: {
    attemptId: string;
    state: ContributeAttemptState;
    updatedAt: string;
    currentAttemptId: string | null;
  } | null;
  prNumber: number | null;
  org: string;
  blocked: ReadonlySet<ActionId>;
  prOpen: boolean;
  grantConnected: boolean;
  grantAvailable: boolean;
  /** The move card's shared reasons, by run: its rows say only "Not posted". */
  cardReasons: Record<string, string[]>;
  /** The pane draws a move card (a row's discard error shows there, else under the row). */
  cardShown: boolean;
  orgAccess: OrgAccess;
  now?: Date;
  /** Collapsed groups drawn open (the catalogue). */
  defaultOpen?: GroupId[];
  /** Rows drawn open besides those that open by default (the catalogue, a row a link names). */
  openRows?: string[];
};

const OPEN_FIRST = new Set<RowState>(['not-posted-own', 'needs-you']);
const EDITABLE = new Set<RowState>(['needs-you', 'draft-review']);
const PREFIX = '#comment-';
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * Review comments, one list for a comment's whole life (M7): waiting for a run, in a run's review, and after. Rows open
 * in place; groups say what the user does with them; a reason the replies of a run share is said once, by the move
 * card or by one line here. `#comment-<id>` opens its row (the card's "Show it").
 */
export function ReviewComments(props: ReviewCommentsProps) {
  const { mode, drafts = [], threads = [], run = null, first = null, blocked, cardReasons } = props;
  const session = useSessionActions();
  const cardOf = (runId: string) => new Set(cardReasons[runId] ?? []);
  const own = mode === 'perReply' ? ownLinesOf(drafts, cardOf) : [];
  const said = (draft: ContributeReplyDraft) =>
    cardOf(draft.attemptId).has(reasonKeyOf(draft)) ||
    own.some((line) => line.runId === draft.attemptId && line.reason === reasonKeyOf(draft));
  const rows: CommentRowItem[] =
    mode === 'waiting'
      ? threads.map((thread) => ({ key: thread.commentId, state: threadStateOf(thread), thread }))
      : drafts
          .filter((draft) => !session?.replies?.dropped.has(draft.draftId))
          .map((draft) => ({
            key: draft.draftId,
            state: rowStateOf(mode, draft, {
              runState: run?.state ?? null,
              saidElsewhere: new Set(said(draft) ? [reasonKeyOf(draft)] : []),
            }),
            draft,
          }));
  const groups = groupsOf(rows, mode);
  const resolveLines = mode === 'perReply' ? resolveLinesOf(drafts) : [];
  const replyBlock =
    run && !run.flow && run.state === 'REVIEW' && run.hasPatch ? replyBlockOf({ state: 'REVIEW', patch: 'x' }) : null;

  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(
    () =>
      new Set([...rows.filter(({ state }) => OPEN_FIRST.has(state)).map(({ key }) => key), ...(props.openRows ?? [])]),
  );
  const [openGroups, setOpenGroups] = useState<ReadonlySet<GroupId>>(() => new Set(props.defaultOpen ?? []));
  const [more, setMore] = useState<ReadonlySet<GroupId>>(() => new Set());
  const toggles = useRef(new Map<string, HTMLButtonElement>());
  const latest = useRef(groups);
  latest.current = groups;

  // A link to a row (the card's "Show it") opens it: its group, its "Show N more", the row; then the hash goes, so the
  // same link works again.
  useEffect(() => {
    const show = () => {
      if (!window.location.hash.startsWith(PREFIX)) return;
      const key = window.location.hash.slice(PREFIX.length);
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      const target = rowTargetOf(latest.current, key);
      if (!target) return;
      if (target.openGroup) setOpenGroups((current) => new Set([...current, target.group]));
      if (target.showMore) setMore((current) => new Set([...current, target.group]));
      setOpenRows((current) => new Set([...current, key]));
      requestAnimationFrame(() => {
        document
          .getElementById(`comment-${key}`)
          ?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
        toggles.current.get(key)?.focus({ preventScroll: true });
      });
    };
    show();
    window.addEventListener('hashchange', show);
    return () => window.removeEventListener('hashchange', show);
  }, []);

  if (!rows.length) return null;

  const addressed = session?.threads ? session.threads.chosen.length : undefined;
  const summary = summaryOf(rows, mode, run, { addressed, readAt: props.readAt, now: props.now });
  const error = session?.error;
  const openCount = groups.filter(({ collapsed }) => !collapsed).length;
  const ctx = {
    blocked,
    prOpen: props.prOpen,
    replyBlock: run ? replyBlockOf({ state: run.state, patch: run.hasPatch ? 'x' : null }) : null,
    grantConnected: props.grantConnected,
    grantAvailable: props.grantAvailable,
  };

  const rowOf = ({ key, state, draft, thread }: CommentRowItem) => {
    const rowError =
      error?.key === key && (error.source === 'choice' || (error.source === 'discard' && !props.cardShown))
        ? error.text
        : null;
    const open = openRows.has(key);
    const toggle = (next: boolean) =>
      setOpenRows((current) => new Set(next ? [...current, key] : [...current].filter((each) => each !== key)));
    const item = (draft ? { key, state, draft } : { key, state, thread }) as CommentRowItem;
    return (
      <CommentRow
        key={key}
        item={item}
        open={open}
        onOpenChange={toggle}
        blocked={blocked}
        rowError={rowError}
        toggleRef={(element) => {
          if (element) toggles.current.set(key, element);
          else toggles.current.delete(key);
        }}
      >
        {thread ? (
          <ThreadOpen thread={thread} />
        ) : draft ? (
          <DraftOpen
            draft={draft}
            state={state}
            editing={mode === 'review' && EDITABLE.has(state) && !blocked.has('push') && !!session?.replies}
            actions={
              mode === 'readOnly' || (mode === 'review' && !EDITABLE.has(state))
                ? null
                : rowActionsOf(state, draft, {
                    ...ctx,
                    byCard: cardOf(draft.attemptId).has(state === 'held-back' ? HELD_BACK_REASON : reasonKeyOf(draft)),
                  })
            }
            version={
              run
                ? rowVersionOf(draft, { run })
                : first
                  ? rowVersionOf(draft, {
                      first: { ...first, followUps: { currentAttemptId: first.currentAttemptId } as never },
                    })
                  : `${draft.state}|${draft.updatedAt}`
            }
            prNumber={props.prNumber}
            orgAccess={props.orgAccess}
            firstId={!run && first ? first.attemptId : null}
            resolveSaid={resolveLines.some((line) => line.reason === reasonKeyOf(draft))}
          />
        ) : null}
      </CommentRow>
    );
  };

  const linesOf = (group: CommentGroup) => [
    ...(group.id === 'not-posted'
      ? own.map(({ reason, drafts: list }) =>
          replyTroubleLineOf(
            reason,
            list.length,
            props.org,
            run?.state === 'DONE' && run.hasPatch,
            list[0].lastError?.note,
          ),
        )
      : []),
    ...(group.id === 'posted'
      ? resolveLines.map(({ count, note }) => `${count} threads weren't resolved: ${note}`)
      : []),
    ...(group.id === 'ready' && replyBlock ? [replyBlock] : []),
  ];

  const list = (group: CommentGroup) => {
    const shown = group.more && !more.has(group.id) ? group.rows.slice(0, SHOWN_BEFORE_MORE) : group.rows;
    const lines = linesOf(group);
    return (
      <>
        <ul className="flex flex-col divide-y">{shown.map(rowOf)}</ul>
        {shown.length < group.rows.length ? (
          <Button
            type="button"
            variant="link"
            onClick={() => setMore((current) => new Set([...current, group.id]))}
            className="min-h-11 self-start px-4 sm:min-h-9"
          >
            Show {group.rows.length - shown.length} more
          </Button>
        ) : null}
        {lines.map((line) => (
          <p key={line} data-comments-line={group.id} className="border-t px-4 py-2.5 text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </>
    );
  };

  return (
    <section data-panel="review-comments" aria-labelledby="review-comments-title">
      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5">
          <h2 id="review-comments-title" className={HEADING.card}>
            Review comments
          </h2>
          <Pill tone={summary.count.tone}>{summary.count.label}</Pill>
          {summary.fact ? <span className="ml-auto text-xs text-muted-foreground">{summary.fact}</span> : null}
        </div>
        {groups.map((group) =>
          group.collapsed ? (
            <Collapsible
              key={group.id}
              open={openGroups.has(group.id)}
              onOpenChange={(next) =>
                setOpenGroups(
                  (current) => new Set(next ? [...current, group.id] : [...current].filter((id) => id !== group.id)),
                )
              }
              data-group={group.id}
              className="border-t"
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full justify-between rounded-none px-4 text-sm font-semibold"
                >
                  {GROUP_TITLES[group.id]} · {group.rows.length}
                  <ChevronDown
                    aria-hidden
                    className="transition-transform motion-reduce:transition-none [[data-state=open]>&]:rotate-180"
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>{list(group)}</CollapsibleContent>
            </Collapsible>
          ) : (
            <div key={group.id} data-group={group.id} className="border-t">
              {group.id !== 'list' && openCount > 1 ? (
                <h3 className="px-4 pt-3 text-sm font-semibold">
                  {GROUP_TITLES[group.id]} · {group.rows.length}
                </h3>
              ) : null}
              {list(group)}
            </div>
          ),
        )}
      </Card>
    </section>
  );
}
