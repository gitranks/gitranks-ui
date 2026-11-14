'use client';

import type { ReactElement, ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * "Are you sure?" before an action that cannot be undone, or not easily: what goes, and a destructive button that
 * says what it does. `trigger` is the button that opens it, and gets the focus back on Cancel. Cancel takes the focus
 * first. It stays open while the action runs, and shows why it failed; the caller closes it once the action went
 * through, and moves the focus to what says so when the trigger goes with it.
 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  action,
  pendingAction,
  pending,
  error,
  body,
  onConfirm,
  onCloseAutoFocus,
  actionVariant = 'destructive',
}: {
  trigger: ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The confirm button: what it does, as in "Skip issue". */
  action: string;
  /** The confirm button while the action runs, as in "Skipping…". */
  pendingAction: string;
  pending: boolean;
  error?: ReactNode;
  /** Under the description: what the action sends, to read before it goes (a comment's text). */
  body?: ReactNode;
  onConfirm: () => void;
  /** Where the focus goes on close, when not back to the trigger (which may be off by then). */
  onCloseAutoFocus?: (event: Event) => void;
  /** The confirm button's look: destructive (a discard), or the default for an action that posts or pushes. */
  actionVariant?: 'default' | 'destructive';
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {body}
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" variant={actionVariant} onClick={onConfirm} disabled={pending}>
            {pending ? pendingAction : action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
