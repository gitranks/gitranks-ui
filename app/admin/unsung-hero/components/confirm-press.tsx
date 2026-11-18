'use client';

import { type ComponentProps, useState } from 'react';

import type { AdminIntent } from '../admin-state';
import type { PressAction } from './press';
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

/** What a confirm step says: the question, what cannot be undone, and the button that does it. */
export type ConfirmCopy = { title: string; description: string; confirm: string };

/**
 * A press that cannot be undone: its button only opens the question, and the confirm button inside it POSTs the press,
 * the same form a plain button would send. Cancel posts nothing.
 */
export function ConfirmPress({
  action,
  intent,
  fields,
  pending,
  label,
  variant = 'outline',
  copy,
}: Readonly<{
  action?: PressAction;
  intent: AdminIntent;
  fields: Record<string, string>;
  pending?: boolean;
  /** The button on the board. */
  label: string;
  variant?: ComponentProps<typeof Button>['variant'];
  copy: ConfirmCopy;
}>) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size="sm" disabled={pending}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} onSubmit={() => setOpen(false)}>
          <input type="hidden" name="intent" value={intent} />
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={pending}>
              {copy.confirm}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
