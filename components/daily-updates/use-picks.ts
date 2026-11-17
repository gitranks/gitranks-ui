'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { useState } from 'react';
import { toast } from 'sonner';

import type { DailyUpdatesViewerState } from './use-daily-updates-viewer';
import { PICK_TOASTS, PICKS_MAX, type PickMessageKind } from '@/app/repo/[owner]/[name]/utils/pick-messages';
import { REFRESH_TOASTS } from '@/components/refresh-dialogs/refresh-messages';
import type {
  DailyUpdatesPickResult,
  DailyUpdatesRemoveResult,
  DailyUpdatesViewer,
  PickRef,
} from '@/types/daily-updates.types';
import { holdsPick, samePick } from '@/utils/daily-updates-view';

/** A pick's dialog on screen: its star step or block, the full note, or the daily-limit note. */
export type PickDialog =
  | { kind: 'pick'; pick: PickMessageKind; until?: string }
  | { kind: 'allPicksUsed' }
  | { kind: 'dailyLimit'; until: string };

type UsePicksOptions = Pick<DailyUpdatesViewerState, 'viewer' | 'setViewer' | 'reload'> & {
  /** What this page picks. */
  target: PickRef;
  /** Runs once the target is picked, after the press settles. */
  onPicked: () => unknown;
  /** Closes the caller's own dialog: a pick's start, and an answer that daily updates are closed, close every one. */
  onCloseDialog?: () => void;
};

export type PicksState = {
  dialog: PickDialog | null;
  closeDialog: () => void;
  /** The visitor's picks, in their order. */
  picks: PickRef[];
  /** Whether the visitor may add a pick now: fewer than 3 held, and a new one left today. */
  hasPickLeft: boolean;
  /** A pick of the target is under way. */
  picking: boolean;
  /** The pick whose removal is under way. */
  removing: PickRef | null;
  /** The visitor removed the target's pick here: the page's pick reason may be theirs, so their state decides. */
  removedHere: boolean;
  /** Picks the target; once picked, `onPicked`. */
  pick: () => Promise<void>;
  remove: (held: PickRef) => Promise<void>;
};

const PICKS_URL = '/api/daily-updates/picks';

/** When the next new pick opens: the next UTC day, as the API counts them. */
const nextPickDayOf = (now: number) => {
  const day = new Date(now);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1)).toISOString();
};

const hasPickLeft = (viewer: DailyUpdatesViewer | null) =>
  !!viewer && viewer.picks.length < PICKS_MAX && viewer.newPicksLeftToday > 0;

/** The toast for a refused pick call, by its HTTP status: a removed account, a name the API refuses, or a failure. */
const refusedToast = (status: number, failed: string) =>
  status === 410 ? REFRESH_TOASTS.removed : status === 400 ? PICK_TOASTS.notHeld : failed;

const pickRequest = (method: 'POST' | 'DELETE', { kind, name }: PickRef) =>
  fetch(PICKS_URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, name }),
  });

/**
 * The visitor's picks on a page that can be picked: adding the page's own, removing any, the refusals and their
 * dialogs. Daily updates closed to the visitor since the page read them (403) drop the viewer, so the page shows
 * today's button again.
 */
export function usePicks({ target, viewer, setViewer, reload, onPicked, onCloseDialog }: UsePicksOptions): PicksState {
  const [dialog, setDialog] = useState<PickDialog | null>(null);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<PickRef | null>(null);
  const [removedHere, setRemovedHere] = useState(false);
  const picks = viewer?.picks.map(({ kind, name }) => ({ kind, name })) ?? [];

  // Whatever dialog is on screen, the caller's too.
  const closeAll = () => {
    setDialog(null);
    onCloseDialog?.();
  };

  const openDialog = (next: PickDialog) => {
    sendGAEvent('event', 'daily_updates_dialog_open', { kind: next.kind === 'pick' ? next.pick : next.kind });
    setDialog(next);
  };

  // Daily updates closed to this visitor since the page read them: today's button again.
  const close = () => {
    closeAll();
    setViewer(null);
  };

  const pick = async () => {
    closeAll();
    setPicking(true);
    let picked = false;

    try {
      const res = await pickRequest('POST', target);
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
                state: holdsPick(current, target) ? current.state : 'on',
                picks: result.picks,
                newPicksLeftToday: result.newPicksLeftToday,
              },
          );
          setRemovedHere(false);
          picked = true;
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
          openDialog({ kind: 'pick', pick: 'starStep' });
          break;
        case 'blocked':
          openDialog({ kind: 'pick', pick: 'blocked', until: result.until });
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

    if (picked) {
      await onPicked();
    }
  };

  const remove = async (held: PickRef) => {
    setRemoving(held);

    try {
      const res = await pickRequest('DELETE', held);
      if (res.status === 403) {
        return close();
      }
      if (!res.ok) {
        toast.error(refusedToast(res.status, PICK_TOASTS.removeFailed));
        return;
      }

      const result = (await res.json()) as DailyUpdatesRemoveResult;
      setViewer((current) => current && { ...current, picks: result.picks });
      if (samePick(held, target)) {
        setRemovedHere(true);
      }
    } catch {
      toast.error(PICK_TOASTS.removeFailed);
    } finally {
      setRemoving(null);
    }
  };

  return {
    dialog,
    closeDialog: () => setDialog(null),
    picks,
    hasPickLeft: hasPickLeft(viewer),
    picking,
    removing,
    removedHere,
    pick,
    remove,
  };
}
