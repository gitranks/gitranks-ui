'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { approveAttempt, discardAttempt } from '../actions';
import { HEADING } from './primitives';
import { reducedMotion } from './submit-stepper';
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
import { Textarea } from '@/components/ui/textarea';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';
import { PR_BODY_MAX, PR_TITLE_MAX, prBodyPreview, prFooterText } from '@/lib/contribute/attempt-format';
import type { ContributeDcoMode } from '@/lib/contribute/contribute.types';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';
import {
  RESUME_PARAM,
  resumeHrefOf,
  savePendingApproval,
  sendPendingApproval,
  tabStoreOf,
  takePendingApproval,
} from '@/lib/contribute/grant-resume';
import { settingsPathOf } from '@/lib/contribute/settings-paths';

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
  /**
   * GitHub access for pull requests is not connected (or a submit bounced for want of it): the submit asks for it
   * first, and the pull request opens once the user is back.
   */
  grantNeeded?: boolean;
  /** GitHub access is connected: back from GitHub, the kept approval may be sent. */
  grantConnected?: boolean;
};

/** A fresh nonce for the way back from GitHub. */
const nonceOf = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');

type Confirm = 'approve' | 'discard' | null;

/** Up to the top of the page, where the submission's progress shows once it starts. */
const scrollToProgress = () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });

/** The focus on the attempt's status box, which shows the progress, without scrolling to it a second time. */
const focusProgress = () =>
  document.querySelector<HTMLElement>('[data-attempt-status]')?.focus({ preventScroll: true });

/**
 * The pull request as it will open: an editable title and body, the footer line, DCO, then Submit or Discard. On the
 * first one, before GitHub access is connected, Submit asks for it: the approval waits in the tab, GitHub asks, and
 * back here with the access (and the nonce the tab kept) it is sent at once.
 */
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
  grantNeeded = false,
  grantConnected = false,
}: PrFormProps) {
  const router = useRouter();
  const id = useId();
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [dco, setDco] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  /** On the way to GitHub, or back from it with the pull request opening. */
  const [handoff, setHandoff] = useState<'github' | 'opening' | null>(null);
  const [pending, startTransition] = useTransition();
  /** The approval went through: the closing dialog hands the focus to the progress, not back to Submit. */
  const approved = useRef(false);
  const busy = pending || handoff !== null;

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
      if (which === 'approve') {
        approved.current = true;
        scrollToProgress();
      }
      setConfirm(null);
      router.refresh();
    });

  // Keep the approval in the tab, then let GitHub ask for access; it sends the user back here with the nonce.
  const allowAndOpen = () => {
    setError(null);
    const nonce = nonceOf();
    if (!savePendingApproval(tabStoreOf(window), { attemptId, title, body, dco: standing || dco, nonce })) {
      setError('This browser keeps nothing for the way back. Allow GitHub access in Settings, then submit here.');
      return;
    }
    setHandoff('github');
    signIn(CONTRIBUTE_PROVIDER, { redirectTo: resumeHrefOf(attemptId, nonce) }).catch(() => {
      setHandoff(null);
      setError('GitHub could not be opened. Try again.');
    });
  };

  // Back from GitHub: with the access connected and the nonce this tab kept, the pull request opens at once. Any other
  // `resume` approves nothing. Either way the parameter goes, so a reload does not try again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the way back.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resume = params.get(RESUME_PARAM);
    if (!resume) return;
    params.delete(RESUME_PARAM);
    const rest = params.toString();
    const clean = `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`;
    const approval = grantConnected ? takePendingApproval(tabStoreOf(window), attemptId, resume) : null;
    if (!approval) {
      router.replace(clean as never, { scroll: false });
      return;
    }
    setTitle(approval.title);
    setBody(approval.body);
    setDco(approval.dco);
    setHandoff('opening');
    // The edits stay in the form's state: a refusal or a failed send gives the form back as the user left it.
    void sendPendingApproval(approval, approveAttempt).then((failure) => {
      if (failure) {
        setHandoff(null);
        setError(failure);
      } else {
        scrollToProgress();
        focusProgress();
      }
      router.replace(clean as never, { scroll: false });
      router.refresh();
    });
  }, []);

  return (
    <form
      id="pr-form"
      data-pr-form={attemptId}
      onSubmit={(event) => {
        event.preventDefault();
        if (!titleMissing) setConfirm('approve');
      }}
      className="flex scroll-mt-20 flex-col gap-3.5 rounded-xl border-2 border-primary bg-card p-4.5"
    >
      <h2 className={HEADING.card}>Your pull request</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Title
        </label>
        <Input
          id={`${id}-title`}
          name="title"
          value={title}
          maxLength={PR_TITLE_MAX}
          required
          onChange={(event) => setTitle(event.target.value)}
          className="h-auto rounded-lg py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-body`} className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id={`${id}-body`}
          name="body"
          rows={11}
          value={body}
          maxLength={PR_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          className="field-sizing-fixed resize-y rounded-lg font-mono text-xs leading-normal md:text-xs"
        />
      </div>
      <div className="flex flex-col gap-1.5" data-pr-preview>
        <span className="text-sm font-medium">Preview: the Markdown GitHub gets</span>
        <div className="flex max-h-72 flex-col gap-2 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs">
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
        <p data-dco="standing" className="text-xs text-muted-foreground">
          The commits are signed off (DCO) under your standing consent.{' '}
          <Link href={settingsPathOf('prs')} prefetch={false} className="text-link">
            Change it in Settings
          </Link>
          .
        </p>
      ) : (
        <label data-dco={dcoAsked ? 'asked' : 'ask'} className="flex cursor-pointer items-start gap-2.5 text-sm">
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
      <span className="text-xs text-muted-foreground">
        Opens on {repo} from your fork, in your name, co-authored by gitranks.
      </span>
      {grantNeeded ? (
        <div data-grant-ask className="flex flex-col gap-2 border-t pt-3.5 text-sm text-foreground/80">
          <p>
            {again
              ? 'GitHub access for pull requests is not connected, so GitHub asks you once more to let us open PRs as you.'
              : "This is your first one, so GitHub asks you once to let us open PRs as you. It's one permission,"}{' '}
            <code className="font-mono">public_repo</code>:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4.5">
            <li>fork the repo into your account and push a branch to it</li>
            <li>open the PR on the original repo, in your name</li>
            <li>never private repos, never workflow files</li>
          </ul>
        </div>
      ) : null}
      {handoff === 'opening' ? (
        <p role="status" data-resume="opening" className="text-sm font-semibold text-primary">
          Opening your PR…
        </p>
      ) : null}
      {error && !confirm ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      <Button type="submit" size="lg" disabled={busy || titleMissing} className="min-h-11.5 font-semibold">
        {handoff === 'github'
          ? 'Opening GitHub…'
          : handoff === 'opening'
            ? 'Opening your PR…'
            : grantNeeded
              ? 'Allow GitHub access and open the PR'
              : again
                ? 'Submit again'
                : 'Submit pull request'}
      </Button>
      {grantNeeded ? (
        <span className="text-xs text-muted-foreground">
          You come back here and the PR opens straight away. Revoke the access any time, on GitHub or in Settings.
        </span>
      ) : null}
      <Button
        type="button"
        variant="destructive-outline"
        onClick={() => setConfirm('discard')}
        disabled={busy}
        className="min-h-10.5"
      >
        Discard
      </Button>

      <Dialog open={confirm !== null} onOpenChange={(open) => !pending && !open && setConfirm(null)}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            if (!approved.current) return;
            event.preventDefault();
            focusProgress();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {confirm === 'discard'
                ? 'Discard this attempt?'
                : grantNeeded
                  ? 'Allow GitHub access and open this pull request?'
                  : 'Submit this pull request?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'discard'
                ? 'Nothing is submitted, and the issue goes back to the pool. What it cost stays spent.'
                : grantNeeded
                  ? `GitHub asks you for public_repo. Then you come back here, and it opens on ${repo} in your name, from your fork, with the title and description as you left them.`
                  : `It opens on ${repo} in your name, from your fork, with the title and description as you left them.`}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
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
              <Button type="button" onClick={() => (grantNeeded ? allowAndOpen() : act('approve'))} disabled={busy}>
                {handoff === 'github'
                  ? 'Opening GitHub…'
                  : pending
                    ? 'Submitting…'
                    : grantNeeded
                      ? 'Continue to GitHub'
                      : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
