'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { type IssuesLayer, IssuesScreen } from '@/components/learn/issues/issues-screen';
import {
  bareRowOf,
  emailCoverOf,
  type IssuesAt,
  type IssuesList,
  type IssuesNames,
  type IssuesView,
  issuesListOf,
  issuesMinePathOf,
  rowsAfterSkip,
} from '@/lib/learn/issues';
import { setLearnIssuesEmailAction } from '@/lib/learn/issues.actions';
import { learnSettingsErrorOf } from '@/lib/learn/settings';
import { hasSessionHint } from '@/lib/session-hint';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/** The person's read of Issues, as their route answers it. */
export type IssuesMine =
  | { state: 'ok'; list: IssuesList; reads: MaskedListReads | null }
  | { state: 'unavailable' }
  | { state: 'failed' }
  | { state: 'signed-out' };

/** The person's five for a view from their route; `failed` on any failure. */
export async function readIssuesMine(view: IssuesView): Promise<IssuesMine> {
  try {
    const res = await fetch(issuesMinePathOf(view), { cache: 'no-store' });
    if (!res.ok) return { state: 'failed' };
    const answer = (await res.json()) as { state?: unknown; list?: unknown; reads?: unknown };
    if (answer.state === 'signed-out' || answer.state === 'unavailable') return { state: answer.state };
    const list = answer.state === 'ok' ? issuesListOf(answer.list) : null;
    if (!list) return { state: answer.state === 'ok' ? 'unavailable' : 'failed' };
    const reads = answer.reads && typeof answer.reads === 'object' ? (answer.reads as MaskedListReads) : null;
    return { state: 'ok', list, reads };
  } catch {
    return { state: 'failed' };
  }
}

/** The person's layer, and the view it was read for. */
type Mine = { key: string; read: IssuesMine };

/**
 * Issues in the browser. The visitor's five (or the merged fixes, or the unavailable state) come drawn from the
 * server; once the page is up, a person with a session reads their own five for the view and they take the visitor's
 * place. A switch or a chip changes the address, and the list is read again for it while the last one stays. After a
 * skip the list is read again and the first new issue takes the skipped row's place. "Email me when one appears"
 * changes in place; on with no address, the page reads again when the person comes back to it, so the line goes once
 * an address is there.
 */
export function IssuesLive({
  view,
  at = 'issues',
  names,
  initial,
}: {
  view: IssuesView;
  at?: IssuesAt;
  names?: IssuesNames;
  /** The public layer, drawn on the server. */
  initial: IssuesLayer;
}) {
  const key = issuesMinePathOf(view);
  const personal = !view.fixed && initial.kind !== 'unavailable';
  const [mine, setMine] = useState<Mine | null>(null);
  const [asking, setAsking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPending, startEmail] = useTransition();
  const viewRef = useRef(view);
  viewRef.current = view;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the view's key stands for the view; Try again reads again.
  useEffect(() => {
    if (!personal || !hasSessionHint(document.cookie)) return;
    let live = true;
    setAsking(true);
    readIssuesMine(view).then((read) => {
      if (!live) return;
      setAsking(false);
      setMine({ key, read });
    });
    return () => {
      live = false;
    };
  }, [key, personal, attempt]);

  const list = mine?.read.state === 'ok' ? mine.read.list : null;
  const setList = useCallback((change: (list: IssuesList) => IssuesList) => {
    setMine((was) => (was?.read.state === 'ok' ? { ...was, read: { ...was.read, list: change(was.read.list) } } : was));
  }, []);

  // On with no address: read again when the person comes back to the page, and say it in place once one is there.
  const waitsForAddress = !!list?.emailOn && !list.emailTo;
  useEffect(() => {
    if (!waitsForAddress) return;
    const again = () => {
      if (document.visibilityState !== 'visible') return;
      readIssuesMine(viewRef.current).then((read) => {
        if (read.state === 'ok') setList((was) => ({ ...was, emailOn: read.list.emailOn, emailTo: read.list.emailTo }));
      });
    };
    window.addEventListener('focus', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      window.removeEventListener('focus', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [waitsForAddress, setList]);

  const onSkipped = useCallback(
    (id: string, next: MaskedIssue) => {
      readIssuesMine(viewRef.current).then((read) => {
        setList((was) => {
          const rows = rowsAfterSkip(was.rows, id, read.state === 'ok' ? read.list.rows : null, bareRowOf(next));
          return read.state === 'ok' ? { ...read.list, rows } : { ...was, rows };
        });
      });
    },
    [setList],
  );

  const onLeave = useCallback(
    (id: string) => setList((was) => ({ ...was, rows: was.rows.filter((row) => row.issue.id !== id) })),
    [setList],
  );

  const turn = (on: boolean) =>
    startEmail(async () => {
      setEmailError(null);
      const result = await setLearnIssuesEmailAction(on, on ? emailCoverOf(viewRef.current) : null).catch(() => null);
      if (!result) setEmailError(learnSettingsErrorOf('FAILED'));
      else if (!result.ok) setEmailError(learnSettingsErrorOf(result.error));
      else if (!result.data) setEmailError(learnSettingsErrorOf('CLOSED'));
      else {
        const turned = result.data.newIssues;
        setList((was) => ({ ...was, emailOn: turned }));
      }
    });

  let layer: IssuesLayer = initial;
  if (personal && mine) {
    const pending = asking || mine.key !== key;
    if (mine.read.state === 'ok')
      layer = { kind: 'personal', list: mine.read.list, reads: mine.read.reads ?? undefined, pending };
    else if (mine.read.state === 'unavailable') layer = { kind: 'unavailable' };
    else if (mine.read.state === 'failed') layer = { kind: 'failed' };
  } else if (personal && asking && initial.kind === 'visitor') {
    layer = { ...initial, pending: true };
  }

  return (
    <IssuesScreen
      view={view}
      at={at}
      names={names}
      layer={layer}
      onSkipped={onSkipped}
      onLeave={onLeave}
      onRetry={() => setAttempt((was) => was + 1)}
      email={{ pending: emailPending, error: emailError, onTurnOn: () => turn(true), onTurnOff: () => turn(false) }}
    />
  );
}
