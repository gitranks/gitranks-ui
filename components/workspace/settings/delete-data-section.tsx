'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GITHUB_APPS_URL } from '@/components/workspace/agent/access-section';
import { HEADING, Panel } from '@/components/workspace/primitives';
import { deleteContributeData } from '@/lib/workspace/actions';
import { contributeErrorMessage } from '@/lib/workspace/errors';

/** The word the user types to confirm. */
export const DELETE_CONFIRMATION = 'delete';

/**
 * What deleting removes, as the person has it: the Claude key only with a key. "your Claude key, your agent tokens,
 * the GitHub access, your settings, and your attempts and lessons".
 */
export function deletedThingsOf({ hasKey }: { hasKey: boolean }): string {
  return [
    hasKey ? 'your Claude key' : null,
    'your agent tokens',
    'the GitHub access',
    'your settings',
    'and your attempts and lessons',
  ]
    .filter(Boolean)
    .join(', ');
}

/** Deletes every row on the user, the GitHub grant included, after a typed confirmation. */
export function DeleteDataSection({ hasKey = true }: { hasKey?: boolean }) {
  const things = deletedThingsOf({ hasKey });
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
        <h2 className={HEADING.section}>Delete all data</h2>
        <span className="text-sm text-muted-foreground">
          Removes {things}. Pull requests already on GitHub stay there, and so do our records for stopping abuse: up to
          180 days, or longer while a flag on your account is still open.
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
            )}
            {hasKey ? ' Delete the key in the Claude Console too.' : null}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="destructive-outline"
        onClick={() => setOpen(true)}
        className="min-h-11 px-4 font-semibold"
      >
        Delete everything
      </Button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all your data?</DialogTitle>
            <DialogDescription>
              {things.charAt(0).toUpperCase() + things.slice(1)} go now, and cannot be brought back. Pull requests
              already on GitHub stay there.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-confirm`} className="text-sm font-medium">
              Type <span className="font-mono">{DELETE_CONFIRMATION}</span> to confirm
            </label>
            <Input
              id={`${id}-confirm`}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="h-auto rounded-lg py-2 md:text-base"
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
