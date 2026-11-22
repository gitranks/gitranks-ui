'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { Check, RefreshCw } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import {
  fillName,
  ON_DAILY_DIALOG,
  PICK_LABELS,
  PICK_MESSAGES,
  PICKS_MAX,
  type PicksDialogCopy,
  pickCopyOf,
  pickedOutcomeOf,
} from '../utils/pick-messages';
import {
  allowanceAfter,
  DAILY_UPDATES_NOTES,
  PULL_MESSAGES,
  PULL_TOASTS,
  type PullDialogKind,
  type PullOutcome,
  pullCheckOf,
  pullErrorOutcomeOf,
  pullLabelOf,
  pullModeOf,
  pullOutcomeOf,
  refreshNoteOf,
} from '../utils/pull-messages';
import { reloadWithPullNote, showKeptPullNote } from '../utils/pull-note';
import { PicksDialog } from './picks-dialog';
import { ButtonHint } from '@/components/button-hint/button-hint';
import { useDailyUpdatesText } from '@/components/daily-updates/daily-updates-line';
import { useDailyUpdatesViewer } from '@/components/daily-updates/use-daily-updates-viewer';
import { usePicks } from '@/components/daily-updates/use-picks';
import { dealPageOf, keepDealSignIn, takeDealSignIn } from '@/components/refresh-dialogs/deal-sign-in';
import { RefreshDialog, type RefreshDialogAction } from '@/components/refresh-dialogs/refresh-dialog';
import { fillTime, REFRESH_LABELS, STAR_REPO_URL } from '@/components/refresh-dialogs/refresh-messages';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import type { PickRef } from '@/types/daily-updates.types';
import type { RepoPullAllowance, RepoPullResult, RepoPullStatus } from '@/types/repo-pull.types';
import {
  canPick as canPickOf,
  type DailyUpdatesFacts,
  nextUpdateText,
  pickableUpdatesViewOf,
  withoutPickReason,
} from '@/utils/daily-updates-view';
import { timeLeftUntil } from '@/utils/format-time-left';

type PullButtonProps = {
  owner: string;
  name: string;
  /** The repository's latest fetch, as the page was rendered with it. */
  pull?: { status: string; requestedAt?: unknown } | null;
  /** The repository's daily updates, as the page's data has them; `null` or missing while it is not on them. */
  dailyUpdates?: DailyUpdatesFacts;
};

/**
 * The button's own dialog on screen: one of Refresh's, or, on a repository on daily updates, when next (`yours`: with
 * the visitor's list, as it was their pick when it opened). A pick's dialogs are `usePicks`'.
 */
type OpenDialog = { kind: 'pull'; pull: PullDialogKind; until?: string } | { kind: 'onDaily'; yours: boolean } | null;

const TICK_INTERVAL = 1_000;
const CHECK_STATUS_INTERVAL = 20_000;
const PULL_TIMEOUT = 10 * 60 * 1_000;
const FETCH_MESSAGES = ['Fetching…', '🚬 Still fetching', '👀 👀 👀', 'Ping! Still not ready…'];

const pullUrl = (owner: string, name: string) =>
  `/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pull`;

const sinceRequest = (requestedAt: unknown) =>
  typeof requestedAt === 'string' ? Date.now() - new Date(requestedAt).getTime() : Number.NaN;

/**
 * The repository's one button, like the profile's. Its label follows the state:
 * - on daily updates, for any reason, "Updates daily" with when next; a press opens when next, "Refresh now" while
 *   today's refresh is unused and, on the visitor's own pick, their list. Who else picked it is never said;
 * - a signed-in visitor with a pick left, the API letting them pick: "Update daily" picks it, then refreshes it now;
 * - else Refresh: today's star-history refresh, its allowance and dialogs.
 * The visitor's own state is read after load, never from the cached page; until it is, the button is Refresh. While the
 * session loads, a press does nothing.
 */
export const PullButton: FC<PullButtonProps> = ({ owner, name, pull, dailyUpdates }) => {
  const { data: session, status } = useSession();
  const mode = pullModeOf(session, status);
  const login = status === 'authenticated' ? session?.user?.githubLogin : undefined;
  const { viewer, read, setViewer, reload } = useDailyUpdatesViewer(!!login);
  const nameWithOwner = `${owner}/${name}`;
  const target: PickRef = { kind: 'repo', name: nameWithOwner };
  const url = pullUrl(owner, name);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  // Repositories and packages share the picks: the words name both.
  const copy = pickCopyOf('repo');
  const picks = usePicks({
    target,
    viewer,
    setViewer,
    reload,
    onPicked: () => refreshAfterPick(),
    onCloseDialog: () => setDialog(null),
    toasts: copy.toasts,
  });
  const facts = picks.removedHere ? withoutPickReason(dailyUpdates) : dailyUpdates;
  const view = pickableUpdatesViewOf(facts, viewer, target);
  const onDaily = view !== 'off';
  const canPick = canPickOf(view, viewer, target) && picks.hasPickLeft;
  const containerRef = useRef<HTMLDivElement>(null);
  const attempt = useRef(0);
  const inFlight = useRef(false);
  const pullIdRef = useRef<string | null>(null);
  // Whether the fetch waited on was started by this visitor on this page: only then does its end leave a note.
  const startedHere = useRef(false);
  const followedUp = useRef(false);
  const [allowance, setAllowance] = useState<RepoPullAllowance | null>(null);
  const [checking, setChecking] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(FETCH_MESSAGES[0]);

  // The note a refresh left before the reload stays until the visitor closes it.
  useEffect(() => {
    showKeptPullNote(owner, name, (note, options) => toast.success(note, options));
  }, [owner, name]);

  // The cached page is expired by now, so a reload shows the new numbers; a note waits for the page after it.
  const reloadWithNote = useCallback(
    (note: string | null) => {
      setReloading(true);
      reloadWithPullNote(owner, name, note, () => window.location.reload());
    },
    [owner, name],
  );

  const loadStatus = useCallback(async () => {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as RepoPullStatus) : null;
  }, [url]);

  // Signed-in visitors wait for a running fetch; anyone sends one read for a fetch shown running past the wait.
  useEffect(() => {
    if (mode === 'loading') {
      return;
    }

    const signedIn = mode === 'daily' || mode === 'token';
    const shownRunning = pull?.status === 'running';
    const since = sinceRequest(pull?.requestedAt);
    const waitable = shownRunning && since < PULL_TIMEOUT;

    if (!signedIn && !(shownRunning && !waitable)) {
      return;
    }
    if (signedIn && waitable) {
      setElapsed((prev) => prev ?? Math.max(0, since));
    }

    let cancelled = false;
    loadStatus()
      .then((data) => {
        if (cancelled || !signedIn) {
          return;
        }
        setAllowance(data?.allowance ?? null);
        const running = data?.pull?.status === 'running' ? data.pull : null;
        const runningSince = sinceRequest(running?.requestedAt);
        if (running && runningSince < PULL_TIMEOUT) {
          pullIdRef.current = running.id;
          setElapsed((prev) => prev ?? Math.max(0, runningSince));
        }
      })
      .catch(() => !cancelled && signedIn && setAllowance(null));

    return () => {
      cancelled = true;
    };
  }, [mode, loadStatus, pull?.status, pull?.requestedAt]);

  const checkStatus = useCallback(async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setLoadingLabel('Checking…');
    const data = await loadStatus().catch(() => null);

    switch (pullCheckOf(data, pullIdRef.current)) {
      case 'continue':
        attempt.current += 1;
        setLoadingLabel(FETCH_MESSAGES[attempt.current % FETCH_MESSAGES.length]);
        break;
      case 'stop':
        setElapsed(null);
        break;
      case 'stopFailed':
        setElapsed(null);
        toast.error(PULL_TOASTS.pullFailed);
        break;
      case 'reload':
        // The status read expired the cached page, so a reload shows the new history; no check runs after it.
        // Somebody else's fetch ending reloads without the note.
        reloadWithNote(startedHere.current ? refreshNoteOf() : null);
        return;
    }

    inFlight.current = false;
  }, [loadStatus, reloadWithNote]);

  useEffect(() => {
    if (elapsed === null) {
      return;
    }

    if (elapsed >= PULL_TIMEOUT) {
      toast.info(PULL_TOASTS.timedOut);
      setElapsed(null);
      return;
    }

    const secondsPassed = Math.floor(elapsed / 1000);
    if (secondsPassed > 0 && secondsPassed % (CHECK_STATUS_INTERVAL / 1000) === 0) {
      checkStatus();
    }

    const timer = setTimeout(() => {
      setElapsed((prev) => (prev === null ? null : prev + TICK_INTERVAL));
    }, TICK_INTERVAL);

    return () => clearTimeout(timer);
  }, [elapsed, checkStatus]);

  const openDialog = (next: NonNullable<OpenDialog>) => {
    if (next.kind === 'pull') {
      sendGAEvent('event', 'repo_pull_dialog_open', { kind: next.pull });
    } else {
      sendGAEvent('event', 'daily_updates_dialog_open', { kind: next.kind });
    }
    picks.closeDialog();
    setDialog(next);
  };

  const apply = (outcome: PullOutcome) => {
    switch (outcome.kind) {
      case 'poll':
        if (outcome.toast) {
          toast.success(outcome.toast);
        }
        attempt.current = 0;
        setLoadingLabel(FETCH_MESSAGES[0]);
        setElapsed((prev) => prev ?? 0);
        break;
      case 'reload':
        reloadWithNote(outcome.note);
        break;
      case 'dialog':
        openDialog({ kind: 'pull', pull: outcome.dialog, until: outcome.until });
        break;
      case 'toast':
        toast[outcome.tone](outcome.text);
        break;
    }
  };

  /** Today's free fetch of a visitor without a token, while it is known to be used: when the next one opens. */
  const refreshUsedUntil = () => {
    const nextAt = allowance?.daily.nextAt;
    return mode === 'daily' &&
      allowance &&
      !allowance.daily.available &&
      nextAt &&
      new Date(nextAt).getTime() > Date.now()
      ? nextAt
      : null;
  };

  /**
   * Whether today's refresh is there to press: a daily visitor's unused fetch, or a token visitor's fetches left. Until
   * the allowance is known (its read pending or failed), it is: the API decides, and a used fetch opens its dialog.
   */
  const refreshAvailable =
    mode === 'daily'
      ? !allowance || allowance.daily.available
      : mode === 'token' && (!allowance || allowance.token.used < allowance.token.limit);

  /** Today's refresh. Right after a pick, a refusal is no failure: the pick stands, and the toast says so. */
  const startPull = async (afterPick = false) => {
    setDialog(null);
    picks.closeDialog();
    setChecking(true);
    const settle = (outcome: PullOutcome) => apply(afterPick ? pickedOutcomeOf(outcome, copy.toasts) : outcome);

    try {
      const res = await fetch(url, { method: 'POST' });

      if (!res.ok) {
        settle(pullErrorOutcomeOf(res.status));
        return;
      }

      const result = (await res.json()) as RepoPullResult;
      pullIdRef.current = result.status === 'started' ? result.pullId : null;
      startedHere.current = result.status === 'started';
      setAllowance((prev) => allowanceAfter(result, mode, prev));
      settle(pullOutcomeOf(result, mode));
      loadStatus()
        .then((data) => data && setAllowance(data.allowance))
        .catch(() => {});
    } catch {
      settle(pullErrorOutcomeOf(0));
    } finally {
      setChecking(false);
    }
  };

  /** Once picked: today's refresh now, unless it is known to be used; then the toast says the first update comes soon. */
  const refreshAfterPick = () => {
    if ((mode !== 'daily' && mode !== 'token') || refreshUsedUntil()) {
      apply(pickedOutcomeOf(null, copy.toasts));
      return;
    }
    return startPull(true);
  };

  // The page this sign-in comes back to runs today's refresh by itself.
  const signInFromButton = () => {
    keepDealSignIn(dealPageOf('repo', nameWithOwner));
    return signIn(IDENTITY_PROVIDER);
  };

  /**
   * Back from a sign-in that started at Refresh's sign-in: once the visitor's state is read, today's refresh runs by
   * itself, as that sign-in promised. It never adds the repository to daily updates: "Update daily" waits for a press of
   * its own. A repository on daily updates opens nothing by itself. Back signed out (the sign-in was given up), the mark
   * is dropped, so a later sign-in takes no step by itself. Once a page.
   */
  useEffect(() => {
    if (followedUp.current || status === 'loading') {
      return;
    }
    const page = dealPageOf('repo', nameWithOwner);
    if (status === 'unauthenticated') {
      followedUp.current = true;
      takeDealSignIn(page);
      return;
    }
    if (login && read !== 'done') {
      return;
    }

    followedUp.current = true;
    if (!takeDealSignIn(page) || onDaily) {
      return;
    }
    if (mode === 'daily' || mode === 'token') {
      startPull();
    }
  });

  const onClick = () => {
    if (mode === 'loading') {
      return;
    }
    if (onDaily) {
      return openDialog({ kind: 'onDaily', yours: view === 'your-pick' });
    }
    if (canPick) {
      return picks.pick();
    }

    switch (mode) {
      case 'signed-out':
        return openDialog({ kind: 'pull', pull: 'signIn' });
      case 'daily': {
        const until = refreshUsedUntil();
        return until ? openDialog({ kind: 'pull', pull: 'used', until }) : startPull();
      }
      case 'token':
        return startPull();
    }
  };

  const pullActions: Record<PullDialogKind, { primary: RefreshDialogAction; secondary?: RefreshDialogAction }> = {
    signIn: { primary: { onClick: signInFromButton } },
    needStar: { primary: { href: STAR_REPO_URL }, secondary: { onClick: () => startPull() } },
    used: { primary: { onClick: () => signIn(TOKEN_PROVIDER) } },
    blocked: { primary: { href: STAR_REPO_URL } },
  };

  const cta = (kind: PullDialogKind, action: RefreshDialogAction): RefreshDialogAction => ({
    ...action,
    onClick: () => {
      sendGAEvent('event', 'repo_pull_dialog_cta', { kind });
      action.onClick?.();
    },
  });

  const focusBack = (event: Event) => {
    event.preventDefault();
    containerRef.current?.querySelector('button')?.focus();
  };

  const onOpenChange = (open: boolean) => !open && setDialog(null);

  const onPickOpenChange = (open: boolean) => !open && picks.closeDialog();

  /** A pick's dialog on screen. */
  const pickDialogOf = (dialog: NonNullable<typeof picks.dialog>) => {
    switch (dialog.kind) {
      case 'pick':
        return (
          <RefreshDialog
            open
            onOpenChange={onPickOpenChange}
            message={PICK_MESSAGES[dialog.pick]}
            time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
            primary={{ href: STAR_REPO_URL }}
            secondary={dialog.pick === 'starStep' ? { onClick: picks.pick } : undefined}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'allPicksUsed':
        return (
          <PicksDialog
            open
            onOpenChange={onPickOpenChange}
            copy={{
              ...copy.dialogs.allPicksUsed,
              paragraph: fillName(copy.dialogs.allPicksUsed.paragraph ?? '', nameWithOwner),
            }}
            picks={picks.picks}
            onRemove={picks.remove}
            removing={picks.removing}
            // Once one is removed, "Done" picks this repository.
            onPrimary={() => (picks.picks.length < PICKS_MAX ? picks.pick() : picks.closeDialog())}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'dailyLimit': {
        const limit = copy.dialogs.dailyLimit;
        return (
          <PicksDialog
            open
            onOpenChange={onPickOpenChange}
            copy={{ ...limit, paragraph: fillTime(limit.paragraph ?? '', timeLeftUntil(dialog.until)) }}
            onPrimary={picks.closeDialog}
            onCloseAutoFocus={focusBack}
          />
        );
      }
    }
  };

  /** The dialog on screen; it stays until its action ends, whatever the state under it becomes. */
  const openDialogOf = () => {
    if (picks.dialog) {
      return pickDialogOf(picks.dialog);
    }

    switch (dialog?.kind) {
      case 'pull':
        return (
          <RefreshDialog
            open
            onOpenChange={onOpenChange}
            message={PULL_MESSAGES[dialog.pull]}
            time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
            primary={cta(dialog.pull, pullActions[dialog.pull].primary)}
            secondary={pullActions[dialog.pull].secondary}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'onDaily': {
        const yours = copy.dialogs.yourDailyUpdates;
        const buttons = refreshAvailable
          ? { primary: ON_DAILY_DIALOG.refresh, secondary: ON_DAILY_DIALOG.close }
          : { primary: dialog.yours ? yours.primary : ON_DAILY_DIALOG.done };
        const onDailyCopy: PicksDialogCopy = dialog.yours
          ? { title: yours.title, paragraph: yours.paragraph, ...buttons }
          : { title: copy.onDailyTitle, ...buttons };
        return (
          <PicksDialog
            open
            onOpenChange={onOpenChange}
            copy={onDailyCopy}
            // When next, while it still updates every day: after its own pick is removed here, it may not.
            lead={onDaily ? nextUpdateText(facts?.nextUpdateAt, Date.now()) : null}
            {...(dialog.yours
              ? {
                  picks: picks.picks,
                  profileLogin: login,
                  showLeft: true,
                  onRemove: picks.remove,
                  removing: picks.removing,
                }
              : { removing: null })}
            onPrimary={refreshAvailable ? () => startPull() : () => setDialog(null)}
            onCloseAutoFocus={focusBack}
          />
        );
      }
      default:
        return null;
    }
  };

  const busyLabel = reloading
    ? 'Reloading…'
    : elapsed !== null
      ? loadingLabel
      : checking || picks.picking
        ? REFRESH_LABELS.checking
        : null;

  const label = onDaily ? (
    <>
      <Check className="size-4" aria-hidden />
      {PICK_LABELS.updatesDaily}
    </>
  ) : (
    <>
      {canPick ? PICK_LABELS.updateDaily : pullLabelOf(mode, allowance)}
      <RefreshCw className="size-4" />
    </>
  );

  // What the grey line under the button used to say, now its hint: why it updates every day and when next, or the
  // picks it can use.
  const dailyText = useDailyUpdatesText(
    view === 'your-pick'
      ? copy.lines.yourPick
      : view === 'on-badge'
        ? DAILY_UPDATES_NOTES.byBadge
        : DAILY_UPDATES_NOTES.byPick,
    facts?.nextUpdateAt,
  );
  const hint = busyLabel !== null ? undefined : onDaily ? dailyText : canPick ? copy.lines.off : undefined;

  return (
    <div ref={containerRef} className="flex min-w-0 flex-col">
      <ButtonHint hint={hint} actsAtOnce={!onDaily}>
        <Button
          size="sm"
          variant={onDaily ? 'outline' : 'default'}
          className="w-full"
          onClick={onClick}
          disabled={busyLabel !== null}
        >
          {busyLabel !== null ? (
            <>
              {busyLabel}
              <ClipLoader loading size={16} color="currentColor" />
            </>
          ) : (
            label
          )}
        </Button>
      </ButtonHint>
      {openDialogOf()}
    </div>
  );
};
