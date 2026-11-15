'use client';

import type { FC } from 'react';

import { PICK_LIST, PICKS_MAX, type PicksDialogCopy, picksLeftText } from '../utils/pick-messages';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PicksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The copy, its `{repo}` and `{time}` filled. */
  copy: PicksDialogCopy;
  /** The visitor's picks as `owner/name`; none for a dialog without the list. */
  picks?: string[];
  /** The visitor's own login, first in the list: their profile updates daily with their picks. */
  profileLogin?: string;
  /** The muted last row says how many picks are left. */
  showLeft?: boolean;
  onRemove?: (nameWithOwner: string) => void;
  /** A pick whose removal is under way: its Remove is off. */
  removing?: string | null;
  onPrimary: () => void;
  onCloseAutoFocus?: (event: Event) => void;
};

const ROW = 'flex items-center justify-between gap-3 px-3 py-2';

/** The visitor's daily updates: their profile and their picks, each pick with Remove. Never anyone else's. */
export const PicksDialog: FC<PicksDialogProps> = ({
  open,
  onOpenChange,
  copy,
  picks,
  profileLogin,
  showLeft = false,
  onRemove,
  removing = null,
  onPrimary,
  onCloseAutoFocus,
}) => {
  const left = Math.max(0, PICKS_MAX - (picks?.length ?? 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg leading-snug">{copy.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <DialogDescription className="text-foreground">{copy.paragraph}</DialogDescription>
          {picks && (
            <ul className="overflow-hidden rounded-lg border">
              {profileLogin && (
                <li className={ROW}>
                  <span translate="no">{profileLogin}</span>
                  <span className="text-xs text-muted-foreground">{PICK_LIST.profile}</span>
                </li>
              )}
              {picks.map((nameWithOwner) => (
                <li key={nameWithOwner} className={`${ROW} border-t first:border-t-0`}>
                  <span className="min-w-0 [overflow-wrap:anywhere]" translate="no">
                    {nameWithOwner}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-medium text-link underline-offset-2 hover:underline disabled:opacity-50 max-sm:min-h-11"
                    disabled={removing !== null}
                    aria-label={`${PICK_LIST.remove} ${nameWithOwner}`}
                    onClick={() => onRemove?.(nameWithOwner)}
                  >
                    {PICK_LIST.remove}
                  </button>
                </li>
              ))}
              {showLeft && left > 0 && (
                <li className={`${ROW} border-t text-muted-foreground first:border-t-0`}>{picksLeftText(left)}</li>
              )}
            </ul>
          )}
          {copy.note && <p className="text-xs text-muted-foreground">{copy.note}</p>}
        </div>

        <DialogFooter>
          {copy.secondary && (
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {copy.secondary}
            </Button>
          )}
          <Button type="button" onClick={onPrimary}>
            {copy.primary}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
