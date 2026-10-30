'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { deleteContributeData } from '../actions';
import { GITHUB_APPS_URL } from './access-section';
import { Panel } from './primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { contributeErrorMessage } from '@/lib/contribute/errors';

/** The word the user types to confirm. */
export const DELETE_CONFIRMATION = 'delete';

/** Deletes every Contribute row on the user, the GitHub grant included, after a typed confirmation. */
export function DeleteDataSection() {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ grantRevoked: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmed = typed.trim().toLowerCase() === DELETE_CONFIRMATION;

  const remove = () =>
    startTransition(async () => {
      setError(null);
      const result = await deleteContributeData();
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOpen(false);
      setTyped('');
      setDone({ grantRevoked: result.data.grantRevoked });
      router.refresh();
    });

  return (
    <Panel id="danger" tone="danger" className="flex-row flex-wrap items-center justify-between">
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-1">
        <h2 className="text-lg font-semibold">Delete all Contribute data</h2>
        <span className="text-sm text-muted-foreground">
          Removes your key, the GitHub access, your settings and attempt history. PRs already on GitHub stay there.
        </span>
        {done ? (
          <span role="status" className="text-sm font-medium">
            Deleted.{' '}
            {done.grantRevoked ? (
              'The GitHub access was revoked too.'
            ) : (
              <>
                GitHub could not be told, so revoke the access there:{' '}
                <a href={GITHUB_APPS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                  Authorized OAuth Apps
                </a>
                .
              </>
            )}{' '}
            Delete the key in the Claude Console too.
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="min-h-11 border border-destructive bg-background px-4 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Delete everything
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all Contribute data?</DialogTitle>
            <DialogDescription>
              Your key, the GitHub access, your settings, preferences and attempt history go now, and cannot be brought
              back. Pull requests already on GitHub stay there.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-confirm`} className="text-sm font-medium">
              Type <span className="font-mono">{DELETE_CONFIRMATION}</span> to confirm
            </label>
            <input
              id={`${id}-confirm`}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
            {error ? (
              <span role="alert" className="text-sm text-destructive">
                {error}
              </span>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={!confirmed || pending}>
              {pending ? 'Deleting…' : 'Delete everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
