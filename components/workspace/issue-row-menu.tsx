'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/workspace/confirm-dialog';
import { skipIssue } from '@/lib/workspace/issue-actions';
import { skipOutcomeOf } from '@/lib/workspace/issue-row';
import { startPath } from '@/lib/workspace/paths';

const ITEM = 'min-h-11 cursor-pointer sm:min-h-9';

/**
 * A Contribute row's quiet "⋯": Fix it and teach me (the Start page with a lesson; where the row has a Start), and Skip this issue, which asks first. A Skip that finds the issue taken meanwhile says
 * nothing: the row turns taken (`onTaken`).
 */
export function IssueRowMenu({
  issueId,
  issueRef,
  teach,
  disabled = false,
  onSkipped,
  onTaken,
}: {
  issueId: string;
  issueRef: { repo: string; issue: number };
  /** "Fix it and teach me" shows. */
  teach: boolean;
  disabled?: boolean;
  onSkipped: () => void;
  onTaken: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const where = `${issueRef.repo} #${issueRef.issue}`;

  const skip = () =>
    startTransition(async () => {
      setError(null);
      const outcome = skipOutcomeOf(await skipIssue(issueId));
      if (outcome.kind === 'failed') {
        setError(outcome.message);
        return;
      }
      setConfirming(false);
      if (outcome.kind === 'taken') onTaken();
      else onSkipped();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            className="size-10 flex-none p-0 text-muted-foreground max-sm:size-11"
            data-row-menu=""
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
            <span className="sr-only">More for {where}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {teach ? (
            <DropdownMenuItem asChild className={ITEM}>
              <Link href={startPath(issueRef, { lesson: true, from: 'contribute' })} prefetch={false}>
                Fix it and teach me
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className={ITEM}
            onSelect={() => {
              setError(null);
              setConfirming(true);
            }}
          >
            Skip this issue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Skip this issue?"
        description={
          <>
            <span className="font-mono">{where}</span> will not be picked for you again. You can&apos;t undo this.
          </>
        }
        action="Skip issue"
        pendingAction="Skipping…"
        pending={pending}
        error={error}
        onConfirm={skip}
        onCloseAutoFocus={(event) => {
          // Back to the "⋯" while the row stays; the row moves the focus itself once it is skipped or taken.
          event.preventDefault();
          trigger.current?.focus();
        }}
      />
    </>
  );
}
