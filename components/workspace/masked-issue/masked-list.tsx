'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { MaskedIssueLesson } from '@/components/workspace/masked-issue/facts';
import { MaskedIssueRow, type MaskedRowState } from '@/components/workspace/masked-issue/masked-issue-row';
import { MaskedListFoot } from '@/components/workspace/masked-issue/why-hidden';
import { cn } from '@/lib/utils';
import { type HeldMark, useHeldMark } from '@/lib/workspace/held-mark';
import {
  BAN_TEXT,
  type IssueLookFrom,
  type IssuePageFrom,
  issuePageHrefOf,
  type MaskedListReads,
  NO_MASKED_READS,
} from '@/lib/workspace/masked-issue';
import { lookAtIssue, signInToSeeIssue, skipMaskedIssue } from '@/lib/workspace/masked-issue.actions';
import type { FullIssue, IssueLooksToday, IssueOutReason, MaskedIssue } from '@/lib/workspace/masked-issue.types';

/** What a list's status line says when a press or a skip did not go through, or the issue left. */
export const MASKED_LIST_NOTICES = {
  look: 'The issue did not open. Try again in a minute.',
  skip: 'The issue was not skipped. Try again in a minute.',
  gone: 'That issue is no longer open, so it left your list.',
  limit: 'You have seen all the full issues you can see today. More at 00:00 UTC.',
} as const;

type MaskedListApi = {
  from: IssueLookFrom;
  pageFrom: IssuePageFrom;
  pageView: string | null;
  visitor: boolean;
  colors?: Readonly<Record<string, string>>;
  looks: IssueLooksToday | null;
  /** No full issue left today, or the access is closed: every row's button is dimmed. */
  limited: boolean;
  /** The access is closed: the rows say nothing of the day's limit. */
  closed: boolean;
  onLimit: (looks: IssueLooksToday | null) => void;
  onClosed: () => void;
  say: (text: string) => void;
  /** The mask ids on the screen now, for a skip to leave out of the next one. */
  shown: Set<string>;
  /** The issue the person holds open now, by the browser's mark; null when none. */
  held: HeldMark | null;
};

const MaskedListContext = createContext<MaskedListApi | null>(null);

export type MaskedListProps = {
  /** Where the list is: what a press counts under. */
  from: IssueLookFrom;
  /** The page of one issue it leads to, and back. */
  pageFrom: IssuePageFrom;
  /**
   * Learn's Issues page: the query of the view it shows, which the page of one issue keeps for its way back to the
   * same view. Left out, the way back opens Learn's Issues as it is.
   */
  pageView?: string | null;
  /** A visitor's list: no Skip; "See the full issue" is the GitHub sign-in. */
  visitor?: boolean;
  reads?: MaskedListReads;
  colors?: Readonly<Record<string, string>>;
  /** Under the rows: "Why do we hide issue details?", the day's full issues and the list's status line. */
  foot?: boolean;
  children: ReactNode;
  className?: string;
};

/** Around a list with masked rows: what each row's press and skip need, the day's full issues, and the foot under the rows. */
export function MaskedList({
  from,
  pageFrom,
  pageView = null,
  visitor = false,
  reads = NO_MASKED_READS,
  colors,
  foot = true,
  children,
  className,
}: MaskedListProps) {
  const looksRead = reads.looks;
  const limitedRead = !visitor && !!looksRead && looksRead.left <= 0;
  const [looks, setLooks] = useState(looksRead);
  const [limited, setLimited] = useState(limitedRead);
  const [closed, setClosed] = useState(false);
  const [status, setStatus] = useState('');
  const shown = useRef(new Set<string>()).current;
  const held = useHeldMark();
  // The day read again (a refresh, a way back to the page): its numbers from here on. A closed access stays closed.
  const readKey = `${visitor}:${JSON.stringify(looksRead)}`;
  const [readBefore, setReadBefore] = useState(readKey);
  if (readKey !== readBefore) {
    setReadBefore(readKey);
    setLooks(looksRead);
    setLimited(closed || limitedRead);
  }

  const api = useMemo<MaskedListApi>(
    () => ({
      from,
      pageFrom,
      pageView,
      visitor,
      colors,
      looks,
      limited,
      closed,
      onLimit: (next) => {
        setLimited(true);
        // The day's limit answered is itself the rule at work: its numbers are said from here on. Without them the
        // rows have no note to say, so the status line says it.
        if (next) setLooks(next);
        else if (!looks) setStatus(MASKED_LIST_NOTICES.limit);
      },
      onClosed: () => {
        setLimited(true);
        setClosed(true);
        setStatus(BAN_TEXT);
      },
      say: setStatus,
      shown,
      held: visitor ? null : held,
    }),
    [from, pageFrom, pageView, visitor, colors, looks, limited, closed, shown, held],
  );

  return (
    <MaskedListContext.Provider value={api}>
      <div className={cn('flex flex-col gap-3', className)} data-masked-list={from}>
        {children}
        {foot ? <MaskedListFoot looks={looks} visitor={visitor} numbers={reads.numbers} status={status} /> : null}
      </div>
    </MaskedListContext.Provider>
  );
}

export type MaskedListRowProps = {
  issue: MaskedIssue;
  lesson?: MaskedIssueLesson | null;
  /** A row whose project the person named: the issue in full, shown over the row's facts. */
  full?: FullIssue | null;
  /**
   * The row leaves the list: after "Show the next one", or when the issue is no longer open. The list drops its item;
   * without it the row removes itself.
   */
  onLeave?: () => void;
  /**
   * A skip answered the next issue: the list puts it in the row's place (Learn's lists, the profile). Without it, or
   * with no next issue, the row says it is skipped.
   */
  onReplace?: (next: MaskedIssue) => void;
};

/**
 * One masked row in a `MaskedList`: "See the full issue" holds it and opens its page, or says why not in the row
 * (someone else holds it, the day's limit); a visitor's press is the GitHub sign-in, back to the issue's page. While
 * the person holds another issue open, the row says that seeing it gives that one back; the held issue's own row opens
 * its page without a new press. Skip leaves the issue out for good.
 */
export function MaskedListRow({ issue, lesson = null, full = null, onLeave, onReplace }: MaskedListRowProps) {
  const list = useContext(MaskedListContext);
  const router = useRouter();
  const [state, setState] = useState<Exclude<MaskedRowState, 'limit' | 'full'>>('masked');
  const [gone, setGone] = useState(false);
  // A skip that did not go through brings the row back as it was: a new round of the same row.
  const [round, setRound] = useState(0);
  if (!list) throw new Error('MaskedListRow is used inside a MaskedList');
  const { from, pageFrom, pageView, visitor, shown, say, onLimit, onClosed, held } = list;
  const holdsThis = held?.id === issue.id;

  useEffect(() => {
    shown.add(issue.id);
    return () => {
      shown.delete(issue.id);
    };
  }, [shown, issue.id]);

  const leave = useCallback(() => {
    if (onLeave) onLeave();
    else setGone(true);
  }, [onLeave]);

  const see = useCallback(async () => {
    if (visitor) {
      const form = new FormData();
      form.set('id', issue.id);
      form.set('from', pageFrom);
      if (pageView) form.set('view', pageView);
      await signInToSeeIssue(form);
      return;
    }
    // Held already: its page, with no new press.
    if (holdsThis) {
      router.push(issuePageHrefOf(issue.id, pageFrom, false, pageView));
      return;
    }
    setState('opening');
    const result = await lookAtIssue(issue.id, from).catch(() => null);
    if (!result?.ok) {
      setState('masked');
      say(MASKED_LIST_NOTICES.look);
      return;
    }
    const { outcome, page } = result.data;
    if (outcome === 'OK') {
      router.push(issuePageHrefOf(issue.id, pageFrom, false, pageView));
      return;
    }
    setState('masked');
    if (outcome === 'TAKEN') setState('taken');
    else if (outcome === 'LIMIT') onLimit(page?.looks ?? null);
    else if (outcome === 'SUSPENDED') onClosed();
    else {
      say(MASKED_LIST_NOTICES.gone);
      leave();
    }
  }, [visitor, holdsThis, issue.id, pageFrom, pageView, from, router, say, onLimit, onClosed, leave]);

  const skip = useCallback(
    async (reason: IssueOutReason) => {
      const others = [...shown].filter((id) => id !== issue.id);
      const result = await skipMaskedIssue(issue.id, from, reason, others).catch(() => null);
      if (!result?.ok) {
        say(MASKED_LIST_NOTICES.skip);
        setRound((was) => was + 1);
        return;
      }
      if (onReplace && result.data) onReplace(result.data);
    },
    [shown, issue.id, from, say, onReplace],
  );

  if (gone) return null;
  const rowState: MaskedRowState =
    state !== 'masked' ? state : list.limited ? 'limit' : held && !holdsThis ? 'holding' : 'masked';
  return (
    <MaskedIssueRow
      // A skip that did not go through is a new round of the row: its own Skip question, its own focus.
      key={round}
      issue={issue}
      state={rowState}
      full={full}
      named={!!full}
      lesson={lesson}
      looks={list.closed ? null : list.looks}
      visitor={visitor}
      colors={list.colors}
      onSee={see}
      onSkip={visitor ? undefined : skip}
      onNext={leave}
      onStatus={say}
    />
  );
}
