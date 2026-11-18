'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { Check, RefreshCw } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import { packageApiPath } from '../utils/package-params';
import type { PackageRefreshResult, PackageRefreshStatus } from '../utils/package-refresh.types';
import { PACKAGE_DAILY_NOTES, PACKAGE_REFRESH_LABELS, PACKAGE_REFRESH_TOASTS } from '../utils/package-refresh-messages';
import { PicksDialog } from '@/app/repo/[owner]/[name]/components/picks-dialog';
import {
  fillName,
  ON_DAILY_DIALOG,
  PICK_LABELS,
  PICK_MESSAGES,
  PICKS_MAX,
  type PicksDialogCopy,
  pickCopyOf,
} from '@/app/repo/[owner]/[name]/utils/pick-messages';
import { reloadWithPullNote, showKeptPullNote } from '@/app/repo/[owner]/[name]/utils/pull-note';
import { DailyUpdatesLine } from '@/components/daily-updates/daily-updates-line';
import { useDailyUpdatesViewer } from '@/components/daily-updates/use-daily-updates-viewer';
import { usePicks } from '@/components/daily-updates/use-picks';
import { dealPageOf, keepDealSignIn, takeDealSignIn } from '@/components/refresh-dialogs/deal-sign-in';
import { RefreshDialog } from '@/components/refresh-dialogs/refresh-dialog';
import {
  fillTime,
  packageDealOf,
  REFRESH_LABELS,
  REFRESH_TOASTS,
  STAR_REPO_URL,
} from '@/components/refresh-dialogs/refresh-messages';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { RegistryId } from '@/lib/packages/registries';
import type { PickRefreshStatus } from '@/types/daily-updates.types';
import {
  type DailyUpdatesFacts,
  nextUpdateText,
  packagePickOf,
  pickableUpdatesViewOf,
  withoutPickReason,
} from '@/utils/daily-updates-view';
import { timeLeftUntil } from '@/utils/format-time-left';

type PackageUpdatesButtonProps = {
  /** The registry the package is on. */
  registry: RegistryId;
  /** The package's name: on npm `x` or `@scope/x`. */
  name: string;
  /** The name as the registry writes it, for the dialogs' words; `name` when not given. */
  spelledName?: string;
  /** `owner/name` of the repository that publishes it, for the deal's badge note; none when unknown. */
  repository?: string | null;
  /** The package's daily updates, as the page's data has them; `null` or missing while it is not on them. */
  dailyUpdates?: (DailyUpdatesFacts & { lastUpdatedAt?: string | null }) | null;
  /** A refresh was under way when the page was drawn: the button waits for it and reloads the page when it lands. */
  refreshRunning?: boolean;
};

/** The dialog on screen that is the button's own: the deal, the star check of "Refresh now", or when next. */
type OpenDialog =
  | { kind: 'deal' }
  | { kind: 'refresh'; pick: 'starStep' | 'blocked'; until?: string }
  | { kind: 'onDaily'; yours: boolean }
  | null;

/**
 * A refresh being waited for: when the wait started (the press, for one started here), the last update the page shows,
 * who started it, and how many checks found it still under way.
 */
type Waiting = { since: number; lastUpdatedAt: string | null; startedHere: boolean; checks: number };

/** Between checks of a refresh this visitor started. */
const CHECK_INTERVAL = 10_000;
/** Between checks of one only shown running: slower and slower, as nobody here waits for it. */
const WATCH_INTERVALS = [10_000, 20_000, 40_000];
const WAIT_TIMEOUT = 10 * 60 * 1_000;
/** An update this long before the press still counts as its own: the browser's clock and the API's may differ. */
const CLOCK_SLACK = 5 * 60_000;

const delayOf = ({ startedHere, checks }: Waiting) =>
  startedHere ? CHECK_INTERVAL : WATCH_INTERVALS[Math.min(checks, WATCH_INTERVALS.length - 1)];

/**
 * Whether the status shows a refresh landed since the wait began: an update other than the page's and, for one
 * started here, one made after the press (an older one would be a refresh that failed today saying "Updated").
 */
function landedSince(state: PackageRefreshStatus, waiting: Waiting): boolean {
  if (!state.lastUpdatedAt || state.lastUpdatedAt === waiting.lastUpdatedAt) {
    return false;
  }
  return !waiting.startedHere || new Date(state.lastUpdatedAt).getTime() >= waiting.since - CLOCK_SLACK;
}

/** The page's note key: a package's, never a repository's (no GitHub owner holds `:`). */
const noteOwnerOf = (registry: RegistryId) => `package:${registry}`;

/**
 * A package's one button, outlined (Follow is the page's one violet button), with the four states of daily updates:
 * - not on them: "Refresh" signed out (a press opens the deal: sign in, star our repo, then it is added), "Update daily"
 *   signed in (a press adds it, and that refreshes it now);
 * - on them, as the visitor's own pick, kept on by a badge in its repository's README, or picked by somebody: "Updates
 *   daily", with why and when next; a press says when next, and offers "Refresh now" to a signed-in visitor and, on
 *   their own pick, their list.
 * While a refresh runs it waits, and reloads the page once the refresh lands. The visitor's own state is read after
 * load, never from the cached page.
 */
export const PackageUpdatesButton: FC<PackageUpdatesButtonProps> = ({
  registry,
  name,
  spelledName = name,
  repository,
  dailyUpdates,
  refreshRunning = false,
}) => {
  const { data: session, status } = useSession();
  const login = status === 'authenticated' ? session?.user?.githubLogin : undefined;
  const { viewer, read, setViewer, reload } = useDailyUpdatesViewer(!!login);
  const copy = pickCopyOf(true, 'package');
  const target = packagePickOf({ registry, name });
  const url = packageApiPath(registry, name, 'refresh');
  const page = dealPageOf('package', target.name);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [checking, setChecking] = useState(false);
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [reloading, setReloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const followedUp = useRef(false);

  // A press while one is only watched makes it this visitor's: checked from the press, at the quick pace.
  const startWaiting = useCallback(
    (startedHere: boolean) =>
      setWaiting((prev) =>
        prev && (prev.startedHere || !startedHere)
          ? prev
          : { since: Date.now(), lastUpdatedAt: dailyUpdates?.lastUpdatedAt ?? null, startedHere, checks: 0 },
      ),
    [dailyUpdates?.lastUpdatedAt],
  );

  const afterPick = (refresh?: PickRefreshStatus) => {
    if (refresh === 'started' || refresh === 'running') {
      toast.success(copy.toasts.pickedRefreshing);
      startWaiting(true);
      return;
    }
    toast.success(copy.toasts.pickedNoRefresh);
  };

  const picks = usePicks({
    target,
    viewer,
    setViewer,
    reload,
    onPicked: afterPick,
    onCloseDialog: () => setDialog(null),
    toasts: copy.toasts,
  });
  const facts = picks.removedHere ? withoutPickReason(dailyUpdates) : dailyUpdates;
  const view = pickableUpdatesViewOf(facts, viewer, target);
  const onDaily = view !== 'off';

  // The note a refresh left before the reload stays until the visitor closes it.
  useEffect(() => {
    showKeptPullNote(noteOwnerOf(registry), name, (note, options) => toast.success(note, options));
  }, [registry, name]);

  // A refresh shown running on the page: anyone waits for it.
  useEffect(() => {
    if (refreshRunning) {
      startWaiting(false);
    }
  }, [refreshRunning, startWaiting]);

  const reloadWithNote = useCallback(
    (note: string | null) => {
      setReloading(true);
      reloadWithPullNote(noteOwnerOf(registry), name, note, () => window.location.reload());
    },
    [registry, name],
  );

  // One check at a time, after a pause; an unmount or a move to another page aborts it, and nothing reloads after.
  useEffect(() => {
    if (!waiting || reloading) {
      return;
    }
    let live = true;
    const controller = new AbortController();

    const check = async () => {
      if (Date.now() - waiting.since >= WAIT_TIMEOUT) {
        if (waiting.startedHere) {
          toast.info(PACKAGE_REFRESH_TOASTS.timedOut);
        }
        setWaiting(null);
        return;
      }
      let state: PackageRefreshStatus | null = null;
      try {
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        state = res.ok ? ((await res.json()) as PackageRefreshStatus) : null;
      } catch {
        // Aborted, or asked again at the next check.
      }
      if (!live) {
        return;
      }
      if (!state || state.running) {
        setWaiting((current) => current && { ...current, checks: current.checks + 1 });
        return;
      }
      if (landedSince(state, waiting)) {
        // The status read expired the cached page, so a reload shows the new numbers.
        const note = state.dependentsChecked
          ? PACKAGE_REFRESH_TOASTS.refreshed
          : PACKAGE_REFRESH_TOASTS.refreshedPartly;
        reloadWithNote(waiting.startedHere ? note : null);
        return;
      }
      // Nothing runs and nothing landed: the refresh ended without an update. One this visitor started reloads the
      // page once, without a note, so a name the registry turned out not to have shows as not found.
      if (waiting.startedHere) {
        reloadWithNote(null);
        return;
      }
      setWaiting(null);
    };

    const timer = setTimeout(() => void check(), delayOf(waiting));
    return () => {
      live = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [waiting, reloading, url, reloadWithNote]);

  const openDialog = (next: NonNullable<OpenDialog>) => {
    sendGAEvent('event', 'package_updates_dialog_open', { kind: next.kind === 'refresh' ? next.pick : next.kind });
    picks.closeDialog();
    setDialog(next);
  };

  /** "Refresh now": the package's own refresh of the day, for a signed-in visitor. */
  const refreshNow = async () => {
    setDialog(null);
    picks.closeDialog();
    setChecking(true);
    try {
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        if (res.status === 401) {
          openDialog({ kind: 'deal' });
        } else if (res.status === 410) {
          toast.error(REFRESH_TOASTS.removed);
        } else if (res.status === 404) {
          toast.info(PACKAGE_REFRESH_TOASTS.unknown);
        } else {
          toast.error(REFRESH_TOASTS.checkFailed);
        }
        return;
      }

      const result = (await res.json()) as PackageRefreshResult;
      switch (result.status) {
        case 'started':
          toast.success(PACKAGE_REFRESH_TOASTS.started);
          startWaiting(true);
          break;
        case 'running':
          startWaiting(true);
          break;
        case 'queued':
          toast.success(PACKAGE_REFRESH_TOASTS.queued);
          break;
        case 'up_to_date':
          toast.info(PACKAGE_REFRESH_TOASTS.upToDate);
          break;
        case 'used':
          toast.info(fillTime(PACKAGE_REFRESH_TOASTS.used, timeLeftUntil(result.nextAt)));
          break;
        case 'not_starred':
          openDialog({ kind: 'refresh', pick: 'starStep' });
          break;
        case 'blocked':
          openDialog({ kind: 'refresh', pick: 'blocked', until: result.until });
          break;
        case 'busy':
          toast.info(REFRESH_TOASTS.busy);
          break;
        case 'unknown':
          toast.info(PACKAGE_REFRESH_TOASTS.unknown);
          break;
      }
    } catch {
      toast.error(REFRESH_TOASTS.checkFailed);
    } finally {
      setChecking(false);
    }
  };

  // The page this sign-in comes back to adds the package by itself, as the deal said.
  const signInFromDeal = () => {
    keepDealSignIn(page);
    return signIn(IDENTITY_PROVIDER);
  };

  /**
   * Back from a sign-in that started at the deal: once the visitor's state is read, the package is added (the star
   * step comes first when the star is missing). One on daily updates already opens nothing. Back signed out, the mark
   * is dropped. Once a page.
   */
  useEffect(() => {
    if (followedUp.current || status === 'loading') {
      return;
    }
    if (status === 'unauthenticated') {
      followedUp.current = true;
      takeDealSignIn(page);
      return;
    }
    if (login && read !== 'done') {
      return;
    }
    followedUp.current = true;
    if (takeDealSignIn(page) && !onDaily && login) {
      void picks.pick();
    }
  });

  const onClick = () => {
    if (status === 'loading') {
      return;
    }
    if (onDaily) {
      return openDialog({ kind: 'onDaily', yours: view === 'your-pick' });
    }
    if (!login) {
      return openDialog({ kind: 'deal' });
    }
    return picks.pick();
  };

  const focusBack = (event: Event) => {
    event.preventDefault();
    containerRef.current?.querySelector('button')?.focus();
  };

  const onOpenChange = (open: boolean) => !open && setDialog(null);
  const onPickOpenChange = (open: boolean) => !open && picks.closeDialog();

  /** A pick's dialog on screen. */
  const pickDialogOf = (pickDialog: NonNullable<typeof picks.dialog>) => {
    switch (pickDialog.kind) {
      case 'pick':
        return (
          <RefreshDialog
            open
            onOpenChange={onPickOpenChange}
            message={PICK_MESSAGES[pickDialog.pick]}
            time={pickDialog.until ? timeLeftUntil(pickDialog.until) : undefined}
            primary={{ href: STAR_REPO_URL }}
            secondary={pickDialog.pick === 'starStep' ? { onClick: picks.pick } : undefined}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'allPicksUsed': {
        const full = copy.dialogs.allPicksUsed;
        return (
          <PicksDialog
            open
            onOpenChange={onPickOpenChange}
            copy={{ ...full, paragraph: fillName(full.paragraph ?? '', spelledName) }}
            picks={picks.picks}
            list={copy.list}
            onRemove={picks.remove}
            removing={picks.removing}
            // Once one is removed, "Done" adds this package.
            onPrimary={() => (picks.picks.length < PICKS_MAX ? picks.pick() : picks.closeDialog())}
            onCloseAutoFocus={focusBack}
          />
        );
      }
      case 'dailyLimit': {
        const limit = copy.dialogs.dailyLimit;
        return (
          <PicksDialog
            open
            onOpenChange={onPickOpenChange}
            copy={{ ...limit, paragraph: fillTime(limit.paragraph ?? '', timeLeftUntil(pickDialog.until)) }}
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
      case 'deal':
        return (
          <RefreshDialog
            open
            onOpenChange={onOpenChange}
            message={packageDealOf(spelledName, repository)}
            primary={{
              onClick: () => {
                sendGAEvent('event', 'package_updates_dialog_cta', { kind: 'deal' });
                void signInFromDeal();
              },
            }}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'refresh':
        return (
          <RefreshDialog
            open
            onOpenChange={onOpenChange}
            message={PICK_MESSAGES[dialog.pick]}
            time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
            primary={{ href: STAR_REPO_URL }}
            secondary={dialog.pick === 'starStep' ? { onClick: () => void refreshNow() } : undefined}
            onCloseAutoFocus={focusBack}
          />
        );
      case 'onDaily': {
        const yours = copy.dialogs.yourDailyUpdates;
        const buttons = login
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
                  list: copy.list,
                  profileLogin: login,
                  showLeft: true,
                  onRemove: picks.remove,
                  removing: picks.removing,
                }
              : { removing: null })}
            onPrimary={login ? () => void refreshNow() : () => setDialog(null)}
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
    : waiting
      ? PACKAGE_REFRESH_LABELS.refreshing
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
      {login ? PICK_LABELS.updateDaily : PACKAGE_REFRESH_LABELS.refresh}
      <RefreshCw className="size-4" aria-hidden />
    </>
  );

  const line = onDaily ? (
    <DailyUpdatesLine
      lead={
        view === 'your-pick'
          ? copy.lines.yourPick
          : view === 'on-badge'
            ? PACKAGE_DAILY_NOTES.byBadge
            : PACKAGE_DAILY_NOTES.byPick
      }
      nextUpdateAt={facts?.nextUpdateAt}
    />
  ) : login ? (
    <div className="text-xs text-muted-foreground">{copy.lines.off}</div>
  ) : null;

  return (
    <div ref={containerRef} className="flex flex-grow flex-col gap-2">
      <Button size="sm" variant="outline" className="flex-grow" onClick={onClick} disabled={busyLabel !== null}>
        {busyLabel !== null ? (
          <>
            {busyLabel}
            <ClipLoader loading size={16} color="currentColor" />
          </>
        ) : (
          label
        )}
      </Button>
      {busyLabel === null && line}
      {openDialogOf()}
    </div>
  );
};
