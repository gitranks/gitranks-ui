'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { type IssuesLayer, IssuesScreen } from '@/components/learn/issues/issues-screen';
import { useLessonIssuesEmail } from '@/components/learn/issues/lesson-issues-email';
import type { FixesLayer } from '@/components/learn/issues/real-projects-screen';
import {
  bareRowOf,
  emailCoverOf,
  type IssuesAt,
  type IssuesList,
  type IssuesNames,
  type IssuesView,
  isOwnView,
  issuesEmailStateOf,
  issuesEndOf,
  issuesListOf,
  issuesMinePathOf,
  rowsAfterSkip,
} from '@/lib/learn/issues';
import { setLearnIssuesEmailAction } from '@/lib/learn/issues.actions';
import { learnSignFrom } from '@/lib/learn/learn-sign';
import { lessonIssuesEmailStateOf } from '@/lib/learn/lesson-issues-email';
import { readPassedFixes } from '@/lib/learn/real-projects';
import { learnSettingsErrorOf } from '@/lib/learn/settings';
import { hasSessionHint } from '@/lib/session-hint';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/**
 * The person's read of Issues, as their route answers it; on a view of one lesson, `sign` is the Learn sign (null when
 * not known, and on every other view).
 */
export type IssuesMine =
  | { state: 'ok'; list: IssuesList; reads: MaskedListReads | null; sign: boolean | null }
  | { state: 'unavailable' }
  | { state: 'failed' }
  | { state: 'signed-out' };

/** The person's five for a view from their route; `failed` on any failure. */
export async function readIssuesMine(view: IssuesView): Promise<IssuesMine> {
  try {
    const res = await fetch(issuesMinePathOf(view), { cache: 'no-store' });
    if (!res.ok) return { state: 'failed' };
    const answer = (await res.json()) as { state?: unknown; list?: unknown; reads?: unknown; learnOnboarded?: unknown };
    if (answer.state === 'signed-out' || answer.state === 'unavailable') return { state: answer.state };
    const list = answer.state === 'ok' ? issuesListOf(answer.list) : null;
    if (!list) return { state: answer.state === 'ok' ? 'unavailable' : 'failed' };
    const reads = answer.reads && typeof answer.reads === 'object' ? (answer.reads as MaskedListReads) : null;
    return { state: 'ok', list, reads, sign: learnSignFrom(answer.learnOnboarded) };
  } catch {
    return { state: 'failed' };
  }
}

/** "Email me issues for my lessons" covers the lesson while there is no address: its box says it needs one. */
const lessonWaitsForAddress = (list: IssuesList): boolean =>
  lessonIssuesEmailStateOf({ signedIn: true, list, sign: null }).kind === 'no-address';

/** The person's layer, and the view it was read for. */
type Mine = { key: string; read: IssuesMine };

/** The least time between two reads made when the person comes back to the page, to see an address set meanwhile. */
export const ADDRESS_READ_GAP_MS = 30_000;

/**
 * Issues in the browser. The visitor's five (or the merged fixes, or the unavailable state) come drawn from the
 * server; once the page is up, a person with a session reads their own five for the view and they take the visitor's
 * place. A switch or a chip changes the address, and the list is read again for it while the last one stays. After a
 * skip the list is read again and the first new issue takes the skipped row's place; a read made for another view, or
 * older than one already applied, is dropped, and a row skipped in this view never comes back. "Email me when one
 * appears" changes in place; on with no address, the page reads again when the person comes back to it (at most once
 * in 30 seconds), so the line goes once an address is there. "Try again" reads the person's list again, or the page's
 * own (the visitor's five, the merged fixes) when that is what failed. On a lesson's or a course's own address with
 * fixes on the screen, a person with a session also reads the walkthroughs they passed, for the fixes' "Passed": none
 * is drawn while it loads, when it fails, and for a visitor. On a lesson's own address with no open issue, "Email me
 * issues for my lessons" changes in place the same way, its state from the person's list and the Learn sign read with
 * it.
 */
export function IssuesLive({
  view,
  at = 'issues',
  names,
  initial,
  fixes = null,
}: {
  view: IssuesView;
  at?: IssuesAt;
  names?: IssuesNames;
  /** The public layer, drawn on the server. */
  initial: IssuesLayer;
  /** On a lesson's or a course's own address showing both groups: the merged fixes, drawn on the server. */
  fixes?: FixesLayer | null;
}) {
  const router = useRouter();
  const key = issuesMinePathOf(view);
  const personal = view.show !== 'fixed' && initial.kind !== 'unavailable';
  const own = isOwnView(view, at);
  // The "Passed" marks: asked once there are fixes on the screen, and never for the open issues alone.
  const fixesShown =
    own && ((view.show === 'fixed' && initial.kind === 'fixed') || (view.show === 'both' && fixes?.kind === 'fixed'));
  const [passed, setPassed] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    if (!fixesShown || !hasSessionHint(document.cookie)) return;
    let live = true;
    readPassedFixes().then((read) => {
      if (live) setPassed(read);
    });
    return () => {
      live = false;
    };
  }, [fixesShown]);
  const [mine, setMine] = useState<Mine | null>(null);
  const [asking, setAsking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPending, startEmail] = useTransition();
  const viewRef = useRef(view);
  viewRef.current = view;
  const keyRef = useRef(key);
  keyRef.current = key;

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

  /** Changes the person's list, only while it is the one read for the view `forKey`. */
  const setListOf = useCallback((forKey: string, change: (list: IssuesList) => IssuesList) => {
    setMine((was) =>
      was?.key === forKey && was.read.state === 'ok'
        ? { ...was, read: { ...was.read, list: change(was.read.list) } }
        : was,
    );
  }, []);

  // The skips of the view on the screen, in order, each with the next issue the API chose for it; and the reads the
  // skips make, numbered, so one that lands after a later one is dropped.
  const skips = useRef<{ key: string; next: Map<string, MaskedIssue> }>({ key, next: new Map() });
  const skipReads = useRef({ asked: 0, applied: 0 });

  const onSkipped = useCallback((id: string, next: MaskedIssue) => {
    const forKey = keyRef.current;
    if (skips.current.key !== forKey) skips.current = { key: forKey, next: new Map() };
    const skipped = skips.current.next;
    skipped.set(id, next);
    const ticket = ++skipReads.current.asked;
    readIssuesMine(viewRef.current).then((read) => {
      if (keyRef.current !== forKey || ticket < skipReads.current.applied) return;
      skipReads.current.applied = ticket;
      const fresh = read.state === 'ok' ? read.list.rows : null;
      setMine((was) => {
        if (was?.key !== forKey || was.read.state !== 'ok') return was;
        // Every row skipped in the view and still on the screen gives way, that of an earlier skip whose own read was
        // dropped too. The skip's next issue stands in only when the read failed.
        let rows = was.read.list.rows;
        for (const [skippedId, nextIssue] of skipped) {
          rows = rowsAfterSkip(rows, skippedId, fresh, {
            fallback: fresh ? null : bareRowOf(nextIssue),
            leftOut: skipped.keys(),
          });
        }
        const list = read.state === 'ok' ? { ...read.list, rows } : { ...was.read.list, rows };
        return { ...was, read: { ...was.read, list } };
      });
    });
  }, []);

  const onLeave = useCallback(
    (id: string) =>
      setListOf(keyRef.current, (was) => ({ ...was, rows: was.rows.filter((row) => row.issue.id !== id) })),
    [setListOf],
  );

  const lessonEmail = useLessonIssuesEmail(setListOf, keyRef, viewRef);

  const turn = (on: boolean) =>
    startEmail(async () => {
      setEmailError(null);
      const forKey = keyRef.current;
      const result = await setLearnIssuesEmailAction(on, on ? emailCoverOf(viewRef.current) : null).catch(() => null);
      if (!result) setEmailError(learnSettingsErrorOf('FAILED'));
      else if (!result.ok) setEmailError(learnSettingsErrorOf(result.error));
      else if (!result.data) setEmailError(learnSettingsErrorOf('CLOSED'));
      else {
        const turned = result.data.newIssues;
        setListOf(forKey, (was) => ({ ...was, emailOn: turned }));
      }
    });

  let layer: IssuesLayer = initial;
  if (personal && mine) {
    const pending = asking || mine.key !== key;
    if (mine.read.state === 'ok')
      layer = {
        kind: 'personal',
        list: mine.read.list,
        reads: mine.read.reads ?? undefined,
        pending,
        sign: mine.read.sign,
      };
    else if (mine.read.state === 'unavailable') layer = { kind: 'unavailable' };
    else if (mine.read.state === 'failed') layer = { kind: 'failed' };
  } else if (personal && asking && initial.kind === 'visitor') {
    layer = { ...initial, pending: true };
  }

  // On with no address: while the screen says so, read again when the person comes back to the page (one read at a
  // time, 30 seconds apart at least), and say it in place once an address is there.
  const shownList = layer.kind === 'personal' && !layer.pending ? layer.list : null;
  const waitsForAddress =
    !!shownList &&
    ((!!issuesEndOf(view, shownList, at)?.email && issuesEmailStateOf(shownList).kind === 'no-address') ||
      (at === 'lesson' && !shownList.rows.length && lessonWaitsForAddress(shownList)));
  const addressRead = useRef({ reading: false, last: Number.NEGATIVE_INFINITY });
  useEffect(() => {
    if (!waitsForAddress) return;
    const again = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (addressRead.current.reading || now - addressRead.current.last < ADDRESS_READ_GAP_MS) return;
      addressRead.current = { reading: true, last: now };
      const forKey = keyRef.current;
      readIssuesMine(viewRef.current).then((read) => {
        addressRead.current.reading = false;
        if (read.state !== 'ok') return;
        setListOf(forKey, (was) => ({ ...was, emailOn: read.list.emailOn, emailTo: read.list.emailTo }));
      });
    };
    window.addEventListener('focus', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      window.removeEventListener('focus', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [waitsForAddress, setListOf]);

  // The person's list failed: read it again. The page's own layer failed (a visitor's five, the merged fixes): the
  // page is drawn again on the server, which reads it again. Both failed: both.
  const mineFailed = personal && mine?.key === key && mine.read.state === 'failed';
  const pageFailed = initial.kind === 'failed' || fixes?.kind === 'failed';
  const onRetry = () => {
    if (mineFailed) setAttempt((was) => was + 1);
    if (pageFailed || !mineFailed) router.refresh();
  };

  return (
    <IssuesScreen
      view={view}
      at={at}
      names={names}
      layer={layer}
      fixes={fixes}
      shared={initial.kind === 'visitor' ? initial.rows.length : null}
      passed={passed}
      onSkipped={onSkipped}
      onLeave={onLeave}
      onRetry={onRetry}
      email={{ pending: emailPending, error: emailError, onTurnOn: () => turn(true), onTurnOff: () => turn(false) }}
      lessonEmail={lessonEmail}
    />
  );
}
