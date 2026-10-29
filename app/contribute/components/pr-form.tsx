'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { approveAttempt, discardAttempt } from '../actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PR_BODY_MAX, PR_TITLE_MAX, prBodyPreview, prFooterText } from '@/lib/contribute/attempt-format';
import type { ContributeDcoMode } from '@/lib/contribute/contribute.types';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';

const fieldClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

export type PrFormProps = {
  attemptId: string;
  issueNumber: number;
  repo: string;
  defaultTitle: string;
  defaultBody: string;
  /** The user's login, named as the reviewer in the footer. */
  login: string;
  /** The user's DCO setting; null while it is not known. */
  dcoMode: ContributeDcoMode | null;
  /** The repo's notes mention a sign-off. */
  dcoAsked: boolean;
  /** A submission step that went wrong, so this approval is a second one. */
  again: boolean;
};

type Confirm = 'approve' | 'discard' | null;

/** The pull request as it will open: an editable title and body, the footer line, DCO, then Submit or Discard. */
export function PrForm({
  attemptId,
  issueNumber,
  repo,
  defaultTitle,
  defaultBody,
  login,
  dcoMode,
  dcoAsked,
  again,
}: PrFormProps) {
  const router = useRouter();
  const id = useId();
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [dco, setDco] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const standing = dcoMode === 'STANDING';
  const titleMissing = !title.trim();

  const act = (which: Exclude<Confirm, null>) =>
    startTransition(async () => {
      setError(null);
      const result =
        which === 'approve'
          ? await approveAttempt({ id: attemptId, title, body, dco: standing || dco })
          : await discardAttempt(attemptId);
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setConfirm(null);
      router.refresh();
    });

  return (
    <form
      data-pr-form={attemptId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!titleMissing) setConfirm('approve');
      }}
      className="flex flex-col gap-3.5 rounded-xl border-[1.5px] border-primary bg-card p-4.5"
    >
      <h2 className="text-[15px] font-semibold">Your pull request</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-title`} className="text-[13px] font-medium">
          Title
        </label>
        <input
          id={`${id}-title`}
          name="title"
          value={title}
          maxLength={PR_TITLE_MAX}
          required
          onChange={(event) => setTitle(event.target.value)}
          className={`${fieldClass} text-sm`}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-body`} className="text-[13px] font-medium">
          Description
        </label>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={11}
          value={body}
          maxLength={PR_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          className={`${fieldClass} resize-y font-mono text-[12.5px] leading-normal`}
        />
      </div>
      <div className="flex flex-col gap-1.5" data-pr-preview>
        <span className="text-[13px] font-medium">Preview: the Markdown GitHub gets</span>
        <div className="flex max-h-72 flex-col gap-2 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-[12.5px]">
          <pre className="whitespace-pre-wrap">{prBodyPreview(body, issueNumber)}</pre>
          <span data-pr-footer className="border-t pt-2 text-muted-foreground">
            {prFooterText(login)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          The footer line is added to every pull request, linking gitranks.com.
        </span>
      </div>
      {standing ? (
        <p data-dco="standing" className="text-[13px] text-muted-foreground">
          The commits are signed off (DCO) under your standing consent.{' '}
          <Link href="/contribute/settings" prefetch={false} className="text-primary">
            Change it in Settings
          </Link>
          .
        </p>
      ) : (
        <label data-dco={dcoAsked ? 'asked' : 'ask'} className="flex cursor-pointer items-start gap-2.5 text-[13px]">
          <input
            type="checkbox"
            name="dco"
            checked={dco}
            onChange={(event) => setDco(event.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <span>
            {dcoAsked ? 'This repo asks for a DCO sign-off. ' : 'Sign off the commits (DCO), if the repo asks for it. '}
            I certify the Developer Certificate of Origin for this change.
          </span>
        </label>
      )}
      <span className="text-[12.5px] text-muted-foreground">
        Opens on {repo} from your fork, in your name, co-authored by gitranks.
      </span>
      {error && !confirm ? (
        <span role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </span>
      ) : null}
      <button
        type="submit"
        disabled={pending || titleMissing}
        className="min-h-[46px] rounded-[10px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {again ? 'Submit again' : 'Submit pull request'}
      </button>
      <button
        type="button"
        onClick={() => setConfirm('discard')}
        disabled={pending}
        className="min-h-[42px] rounded-[10px] border bg-background text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Discard
      </button>

      <Dialog open={confirm !== null} onOpenChange={(open) => !pending && !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === 'discard' ? 'Discard this attempt?' : 'Submit this pull request?'}</DialogTitle>
            <DialogDescription>
              {confirm === 'discard'
                ? 'Nothing is submitted, and the issue goes back to the pool. What it cost stays spent.'
                : `It opens on ${repo} in your name, from your fork, with the title and description as you left them.`}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={pending}>
              Cancel
            </Button>
            {confirm === 'discard' ? (
              <Button type="button" variant="destructive" onClick={() => act('discard')} disabled={pending}>
                {pending ? 'Discarding…' : 'Discard'}
              </Button>
            ) : (
              <Button type="button" onClick={() => act('approve')} disabled={pending}>
                {pending ? 'Submitting…' : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
