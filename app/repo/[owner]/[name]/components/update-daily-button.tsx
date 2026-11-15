'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { Check } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { type FC, useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import {
  fillRepo,
  PICK_DIALOGS,
  PICK_LABELS,
  PICK_LINES,
  PICK_MESSAGES,
  PICK_TOASTS,
  PICKS_MAX,
  type PickMessageKind,
  picksDealOf,
} from '../utils/pick-messages';
import { DAILY_UPDATES_NOTES } from '../utils/pull-messages';
import { PicksDialog } from './picks-dialog';
import { DailyUpdatesLine } from '@/components/daily-updates/daily-updates-line';
import { useDailyUpdatesViewer } from '@/components/daily-updates/use-daily-updates-viewer';
import { dealPageOf, keepDealSignIn, takeDealSignIn } from '@/components/refresh-dialogs/deal-sign-in';
import { RefreshDialog } from '@/components/refresh-dialogs/refresh-dialog';
import { fillTime, REFRESH_LABELS, REFRESH_TOASTS, STAR_REPO_URL } from '@/components/refresh-dialogs/refresh-messages';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { DailyUpdatesPickResult, DailyUpdatesRemoveResult } from '@/types/daily-updates.types';
import {
  canPickRepo,
  type DailyUpdatesFacts,
  holdsPick,
  repoUpdatesViewOf,
  withoutPickReason,
} from '@/utils/daily-updates-view';
import { timeLeftUntil } from '@/utils/format-time-left';

type UpdateDailyButtonProps = {
  owner: string;
  name: string;
  /** The repository's daily updates, as the page's data has them; `null` or missing while it is not on them. */
  dailyUpdates?: DailyUpdatesFacts;
};

/** The dialog on screen: the visitor's list, the full or daily-limit note, the deal or a star dialog. */
type OpenDialog =
  | { kind: 'yourDailyUpdates' }
  | { kind: 'allPicksUsed' }
  | { kind: 'dailyLimit'; until: string }
  | { kind: PickMessageKind; until?: string }
  | null;

const PICKS_URL = '/api/daily-updates/picks';

/** When the next new pick opens: the next UTC day, as the API counts them. */
export const nextPickDayOf = (now: number) => {
  const day = new Date(now);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1)).toISOString();
};

/** The toast for a refused call, by its HTTP status: a removed account, a name the API refuses, or a failure. */
const refusedToast = (status: number, failed: string) =>
  status === 410 ? REFRESH_TOASTS.removed : status === 400 ? PICK_TOASTS.notHeld : failed;

const request = (method: 'POST' | 'DELETE', nameWithOwner: string) => {
  const [owner, name] = nameWithOwner.split('/');
  return fetch(PICKS_URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, name }),
  });
};

/**
 * Under the repository's Refresh: why it updates every day, and for a signed-in visitor the API lets pick, "Update
 * daily" or their own pick. Their state is read after load, never from the cached page. Signed out, "Update daily"
 * opens the deal; back from its sign-in, the pick is made by itself. While the API keeps daily updates closed to a
 * signed-in visitor, nothing new shows. Who else picked a repository is never said.
 */
export const UpdateDailyButton: FC<UpdateDailyButtonProps> = ({ owner, name, dailyUpdates }) => {
  const { data: session, status } = useSession();
  const login = status === 'authenticated' ? session?.user?.githubLogin : undefined;
  const signedOut = status === 'unauthenticated';
  const { viewer, read, setViewer, reload } = useDailyUpdatesViewer(!!login);
  const nameWithOwner = `${owner}/${name}`;
  // The visitor removed this repository's pick here: the page's pick reason may be theirs, so their state decides.
  const [removedHere, setRemovedHere] = useState(false);
  const facts = removedHere ? withoutPickReason(dailyUpdates) : dailyUpdates;
  const view = repoUpdatesViewOf(facts, viewer, nameWithOwner);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const followedUp = useRef(false);
  const picks = viewer?.picks.map((pick) => pick.nameWithOwner) ?? [];

  const openDialog = (next: NonNullable<OpenDialog>) => {
    sendGAEvent('event', 'daily_updates_dialog_open', { kind: next.kind });
    setDialog(next);
  };

  // Daily updates closed to this visitor since the page read them: nothing new shows.
  const close = () => {
    setDialog(null);
    setViewer(null);
  };

  const pick = async () => {
    setDialog(null);
    setPicking(true);

    try {
      const res = await request('POST', nameWithOwner);
      if (res.status === 403) {
        return close();
      }
      if (!res.ok) {
        toast.error(refusedToast(res.status, PICK_TOASTS.failed));
        return;
      }

      const result = (await res.json()) as DailyUpdatesPickResult;

      switch (result.status) {
        case 'picked':
          // A new pick starts the visitor's daily updates when they were off; one held already changes nothing.
          setViewer(
            (current) =>
              current && {
                ...current,
                state: holdsPick(current, nameWithOwner) ? current.state : 'on',
                picks: result.picks,
                newPicksLeftToday: result.newPicksLeftToday,
              },
          );
          setRemovedHere(false);
          break;
        case 'full': {
          // The picks as they are now (another tab may have changed them). With no new pick left today, a removal
          // would not let this one in: say when the next one opens instead.
          const fresh = await reload();
          if (fresh && fresh.newPicksLeftToday === 0) {
            openDialog({ kind: 'dailyLimit', until: nextPickDayOf(Date.now()) });
          } else {
            openDialog({ kind: 'allPicksUsed' });
          }
          break;
        }
        case 'daily_limit':
          openDialog({ kind: 'dailyLimit', until: result.nextAt });
          break;
        case 'not_held':
          toast.info(PICK_TOASTS.notHeld);
          break;
        case 'not_starred':
          openDialog({ kind: 'starStep' });
          break;
        case 'blocked':
          openDialog({ kind: 'blocked', until: result.until });
          break;
        case 'busy':
          toast.info(PICK_TOASTS.busy);
          break;
      }
    } catch {
      toast.error(PICK_TOASTS.failed);
    } finally {
      setPicking(false);
    }
  };

  const remove = async (picked: string) => {
    setRemoving(picked);

    try {
      const res = await request('DELETE', picked);
      if (res.status === 403) {
        return close();
      }
      if (!res.ok) {
        toast.error(refusedToast(res.status, PICK_TOASTS.removeFailed));
        return;
      }

      const result = (await res.json()) as DailyUpdatesRemoveResult;
      setViewer((current) => current && { ...current, picks: result.picks });
      if (picked.toLowerCase() === nameWithOwner.toLowerCase()) {
        setRemovedHere(true);
      }
    } catch {
      toast.error(PICK_TOASTS.removeFailed);
    } finally {
      setRemoving(null);
    }
  };

  // The page this sign-in comes back to makes the pick by itself.
  const signInFromDeal = () => {
    keepDealSignIn(dealPageOf('repo', nameWithOwner));
    return signIn(IDENTITY_PROVIDER);
  };

  /**
   * Back from a sign-in that started at the deal on this repository: once the visitor's state is read, the pick is made
   * when they may pick it and have not yet; it asks for the star when there is none. Once a page.
   */
  useEffect(() => {
    if (followedUp.current || !login || read !== 'done') {
      return;
    }

    followedUp.current = true;
    if (takeDealSignIn(dealPageOf('repo', nameWithOwner)) && canPickRepo(view, viewer, nameWithOwner)) {
      pick();
    }
  });

  const focusBack = (event: Event) => {
    event.preventDefault();
    containerRef.current?.querySelector('button')?.focus();
  };

  const onOpenChange = (open: boolean) => !open && setDialog(null);

  const picksDialog = () => {
    if (dialog?.kind === 'yourDailyUpdates') {
      return (
        <PicksDialog
          open
          onOpenChange={onOpenChange}
          copy={PICK_DIALOGS.yourDailyUpdates}
          picks={picks}
          profileLogin={login}
          showLeft
          onRemove={remove}
          removing={removing}
          onPrimary={() => setDialog(null)}
          onCloseAutoFocus={focusBack}
        />
      );
    }

    if (dialog?.kind === 'allPicksUsed') {
      const copy = PICK_DIALOGS.allPicksUsed;
      return (
        <PicksDialog
          open
          onOpenChange={onOpenChange}
          copy={{ ...copy, paragraph: fillRepo(copy.paragraph, nameWithOwner) }}
          picks={picks}
          onRemove={remove}
          removing={removing}
          // Once one is removed, "Done" picks this repository.
          onPrimary={() => (picks.length < PICKS_MAX ? pick() : setDialog(null))}
          onCloseAutoFocus={focusBack}
        />
      );
    }

    if (dialog?.kind === 'dailyLimit') {
      const copy = PICK_DIALOGS.dailyLimit;
      return (
        <PicksDialog
          open
          onOpenChange={onOpenChange}
          copy={{ ...copy, paragraph: fillTime(copy.paragraph, timeLeftUntil(dialog.until)) }}
          onPrimary={() => setDialog(null)}
          onCloseAutoFocus={focusBack}
        />
      );
    }

    if (dialog?.kind === 'picksDeal') {
      return (
        <RefreshDialog
          open
          onOpenChange={onOpenChange}
          message={picksDealOf(nameWithOwner)}
          primary={{ onClick: signInFromDeal }}
          onCloseAutoFocus={focusBack}
        />
      );
    }

    if (dialog?.kind === 'starStep' || dialog?.kind === 'blocked') {
      return (
        <RefreshDialog
          open
          onOpenChange={onOpenChange}
          message={PICK_MESSAGES[dialog.kind]}
          time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
          primary={{ href: STAR_REPO_URL }}
          secondary={dialog.kind === 'starStep' ? { onClick: pick } : undefined}
          onCloseAutoFocus={focusBack}
        />
      );
    }

    return null;
  };

  // A dialog stays on screen until its action ends, whatever the state under it becomes.
  const dialogs = picksDialog();

  if (view === 'repo-on-badge' || view === 'repo-on-pick') {
    return (
      <>
        <DailyUpdatesLine
          lead={view === 'repo-on-badge' ? DAILY_UPDATES_NOTES.byBadge : DAILY_UPDATES_NOTES.byPick}
          nextUpdateAt={facts?.nextUpdateAt}
        />
        {dialogs}
      </>
    );
  }

  // Signed out, a repository not on daily updates offers "Update daily": a press opens the deal.
  if (signedOut && view === 'repo-off') {
    return (
      <div ref={containerRef} className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-grow"
          onClick={() => openDialog({ kind: 'picksDeal' })}
        >
          {PICK_LABELS.updateDaily}
        </Button>
        {dialogs}
      </div>
    );
  }

  const yourPick = view === 'repo-your-pick';
  if (!yourPick && !canPickRepo(view, viewer, nameWithOwner)) {
    return dialogs;
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="flex-grow"
        disabled={picking}
        onClick={() => (yourPick ? openDialog({ kind: 'yourDailyUpdates' }) : pick())}
      >
        {picking ? (
          <>
            {REFRESH_LABELS.checking}
            <ClipLoader loading size={16} color="currentColor" />
          </>
        ) : yourPick ? (
          <>
            <Check className="size-4" aria-hidden />
            {PICK_LABELS.updatesDaily}
          </>
        ) : (
          PICK_LABELS.updateDaily
        )}
      </Button>
      {yourPick ? (
        <DailyUpdatesLine lead={PICK_LINES.yourPick} nextUpdateAt={facts?.nextUpdateAt} />
      ) : (
        <div className="text-xs text-muted-foreground">{PICK_LINES.off}</div>
      )}
      {dialogs}
    </div>
  );
};
