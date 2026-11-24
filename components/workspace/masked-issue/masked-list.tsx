'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { MaskedIssueLesson } from '@/components/workspace/masked-issue/facts';
import { MaskedIssueRow, type MaskedRowState } from '@/components/workspace/masked-issue/masked-issue-row';
import { MaskedListFoot } from '@/components/workspace/masked-issue/why-hidden';
import { cn } from '@/lib/utils';
import {
  BAN_TEXT,
  type IssueLookFrom,
  type IssuePageFrom,
  issuePageHrefOf,
  type MaskedListReads,
  NO_MASKED_READS,
} from '@/lib/workspace/masked-issue';
import { lookAtIssue, signInToSeeIssue, skipMaskedIssue } from '@/lib/workspace/masked-issue.actions';
import type { IssueLooksToday, IssueOutReason, MaskedIssue } from '@/lib/workspace/masked-issue.types';

/** What a list's status line says when a press or a skip did not go through, or the issue left. */
export const MASKED_LIST_NOTICES = {
  look: 'The issue did not open. Try again in a minute.',
  skip: 'The issue was not skipped. Try again in a minute.',
  gone: 'That issue is no longer open, so it left your list.',
} as const;

type MaskedListApi = {
  from: IssueLookFrom;
  pageFrom: IssuePageFrom;
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
};

const MaskedListContext = createContext<MaskedListApi | null>(null);

export type MaskedListProps = {
  /** Where the list is: what a press counts under. */
  from: IssueLookFrom;
  /** The page of one issue it leads to, and back. */
  pageFrom: IssuePageFrom;
  /** A visitor's list: no Skip; "See the full issue" is the GitHub sign-in. */
  visitor?: boolean;
  reads?: MaskedListReads;
  colors?: Readonly<Record<string, string>>;
  /** Under the rows: "Why do we hide issue details?", the day's full issues and the list's status line. */
  foot?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Around a list with masked rows: what each row's press and skip need, the day's full issues, and the foot under the
 * rows. The day's line is shown only once the new rules are live; until then the foot has the link alone.
 */
export function MaskedList({
  from,
  pageFrom,
  visitor = false,
  reads = NO_MASKED_READS,
  colors,
  foot = true,
  children,
  className,
}: MaskedListProps) {
  const [looks, setLooks] = useState(reads.rulesLive ? reads.looks : null);
  const [limited, setLimited] = useState(!visitor && reads.rulesLive && !!reads.looks && reads.looks.left <= 0);
  const [closed, setClosed] = useState(false);
  const [status, setStatus] = useState('');
  const shown = useRef(new Set<string>()).current;

  const api = useMemo<MaskedListApi>(
    () => ({
      from,
      pageFrom,
      visitor,
      colors,
      looks,
      limited,
      closed,
      onLimit: (next) => {
        setLimited(true);
        // The day's limit answered is itself the rule at work: its numbers are said from here on.
        if (next) setLooks(next);
      },
      onClosed: () => {
        setLimited(true);
        setClosed(true);
        setStatus(BAN_TEXT);
      },
      say: setStatus,
      shown,
    }),
    [from, pageFrom, visitor, colors, looks, limited, closed, shown],
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
  /**
   * The row leaves the list: after "Show the next one", or when the issue is no longer open. Without it the row
   * removes itself.
   */
  onLeave?: () => void;
  /** A skip puts the next issue in the row's place, when there is one (Learn's list); else the row says it is skipped. */
  replace?: boolean;
};

/**
 * One masked row in a `MaskedList`: "See the full issue" holds it and opens its page, or says why not in the row
 * (someone else holds it, the day's limit); a visitor's press is the GitHub sign-in, back to the issue's page. Skip
 * leaves the issue out for good.
 */
export function MaskedListRow({ issue: first, lesson = null, onLeave, replace = false }: MaskedListRowProps) {
  const list = useContext(MaskedListContext);
  const router = useRouter();
  const [issue, setIssue] = useState(first);
  const [state, setState] = useState<Exclude<MaskedRowState, 'limit' | 'full'>>('masked');
  const [gone, setGone] = useState(false);
  if (!list) throw new Error('MaskedListRow is used inside a MaskedList');
  const { from, pageFrom, visitor, shown, say, onLimit, onClosed } = list;

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
      await signInToSeeIssue(form);
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
      router.push(issuePageHrefOf(issue.id, pageFrom));
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
  }, [visitor, issue.id, pageFrom, from, router, say, onLimit, onClosed, leave]);

  const skip = useCallback(
    async (reason: IssueOutReason) => {
      const others = [...shown].filter((id) => id !== issue.id);
      const result = await skipMaskedIssue(issue.id, from, reason, others).catch(() => null);
      if (!result?.ok) {
        say(MASKED_LIST_NOTICES.skip);
        return;
      }
      if (replace && result.data) {
        setIssue(result.data);
        setState('masked');
      }
    },
    [shown, issue.id, from, say, replace],
  );

  if (gone) return null;
  const rowState: MaskedRowState = state === 'masked' && list.limited ? 'limit' : state;
  return (
    <MaskedIssueRow
      // A new issue in the row's place is a new row: its own Skip question, its own focus.
      key={issue.id}
      issue={issue}
      state={rowState}
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
