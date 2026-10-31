'use client';

import type { ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * "Are you sure?" before an action that cannot be undone, or not easily: what goes, and a destructive button that
 * says what it does. Cancel takes the focus first. It stays open while the action runs, and shows why it failed; the
 * caller closes it once the action went through.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  pendingAction,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** The confirm button: what it does, as in "Skip issue". */
  action: string;
  /** The confirm button while the action runs, as in "Skipping…". */
  pendingAction: string;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? pendingAction : action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
