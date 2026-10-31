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
import {
  type ChecklistItem,
  type ContributeRepoConventions,
  checklistOf,
  titleBlocks,
} from '@/lib/contribute/pr-conventions';
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
  /**
   * The repo requires a DCO sign-off: the form asks for it (or says the standing consent gives it). False: nothing is
   * shown and nothing is signed off. `undefined` while the API does not say: the form asks, in case the repo does.
   */
  dcoRequired: boolean | undefined;
  /** A submission step that went wrong, so this approval is a second one. */
  again: boolean;
  /**
   * GitHub access for pull requests is not connected (or a submit bounced for want of it): the submit asks for it
   * first, and the pull request opens once the user is back.
   */
  grantNeeded?: boolean;
  /** GitHub access is connected: back from GitHub, the kept approval may be sent. */
  grantConnected?: boolean;
  /** What the repo asks of a PR (its title rule, a CLA, a changelog line); null or absent when none was read. */
  conventions?: ContributeRepoConventions | null;
  /** The change, for the changelog line it adds. */
  patch?: string | null;
};

const MARK: Record<ChecklistItem['state'], string> = { ok: '✓', blocked: '✕', todo: '•', info: '·' };
const MARK_LABEL: Record<ChecklistItem['state'], string> = {
  ok: 'Done:',
  blocked: 'Needed before Submit:',
  todo: 'To do:',
  info: 'Note:',
};

/** "This repo needs": the repo's conventions against the PR as it stands; the title line follows the field live. */
export function RepoNeeds({ items, titleId }: { items: ChecklistItem[]; titleId?: string }) {
  if (!items.length) return null;
  return (
    <section data-repo-needs aria-label="This repo needs" className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-3">
      <h3 className="text-sm font-medium">This repo needs</h3>
      <ul className="flex flex-col gap-1.5 text-xs">
        {items.map((item) => (
          <li
            key={item.key}
            data-need={item.key}
            data-state={item.state}
            id={item.key === 'title' ? titleId : undefined}
            className="flex gap-2"
          >
            <span
              aria-hidden
              className={
                item.state === 'ok'
                  ? 'text-positive'
                  : item.state === 'blocked'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              }
            >
              {MARK[item.state]}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>
                <span className="sr-only">{MARK_LABEL[item.state]} </span>
                {item.label}
                {item.link ? (
                  <>
                    {' '}
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-link">
                      Sign here<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </>
                ) : null}
              </span>
              {item.detail ? (
                <span
                  className={`break-words ${item.state === 'blocked' ? 'text-destructive' : 'text-muted-foreground'} ${
                    item.key === 'changelog' ? 'font-mono' : ''
                  }`}
                >
                  {item.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The approval's `dco`: only where the repo requires a sign-off (or while the API does not say), with the tick or the
 * standing consent. A repo that requires none is never signed off.
 */
export const signOffOf = (dcoRequired: boolean | undefined, mode: ContributeDcoMode | null, ticked: boolean) =>
  dcoRequired !== false && (mode === 'STANDING' || ticked);

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
  dcoRequired,
  again,
  grantNeeded = false,
  grantConnected = false,
  conventions = null,
  patch = null,
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
  const asksDco = dcoRequired !== false;
  const signOff = signOffOf(dcoRequired, dcoMode, dco);
  // A repo that checks every commit fails an unsigned PR: the tick comes first (or Discard).
  const signOffMissing = dcoRequired === true && !signOff;
  // Only a title that fails a rule the repo checks blocks Submit: everything else is the user's to do or to know.
  const titleRuleFails = !titleMissing && titleBlocks(title, conventions?.title);
  const blocked = titleMissing || signOffMissing || titleRuleFails;
  const needs = checklistOf(conventions, { title, patch });

  const act = (which: Exclude<Confirm, null>) =>
    startTransition(async () => {
      setError(null);
      const result =
        which === 'approve'
          ? await approveAttempt({ id: attemptId, title, body, dco: signOff })
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
    if (!savePendingApproval(tabStoreOf(window), { attemptId, title, body, dco: signOff, nonce })) {
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
        if (!blocked) setConfirm('approve');
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
          aria-invalid={titleRuleFails || undefined}
          aria-describedby={needs.some((item) => item.key === 'title') ? `${id}-title-rule` : undefined}
          className="h-auto rounded-lg py-2 text-sm"
        />
      </div>
      <RepoNeeds items={needs} titleId={`${id}-title-rule`} />
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
      {!asksDco ? null : standing ? (
        <p data-dco="standing" className="text-xs text-muted-foreground">
          {dcoRequired
            ? 'This repo requires a DCO sign-off: the commits are signed off under your standing consent.'
            : 'The commits are signed off (DCO) under your standing consent.'}{' '}
          <Link href={settingsPathOf('prs')} prefetch={false} className="text-link">
            Change it in Settings
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label
            data-dco={dcoRequired ? 'required' : 'ask'}
            className="flex cursor-pointer items-start gap-2.5 text-sm"
          >
            <input
              type="checkbox"
              name="dco"
              aria-describedby={`${id}-dco-explained`}
              checked={dco}
              onChange={(event) => setDco(event.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>
              {dcoRequired
                ? 'This repo requires a DCO sign-off. '
                : 'Sign off the commits (DCO), if the repo asks for it. '}
              I certify the Developer Certificate of Origin for this change.
            </span>
          </label>
          <span id={`${id}-dco-explained`} data-dco-explained className="pl-6 text-xs text-muted-foreground">
            DCO is your statement that you wrote this change or have the right to submit it under the project&apos;s
            license; signing off adds a <code className="font-mono">Signed-off-by</code> line with your name to each
            commit.{' '}
            <a href="https://developercertificate.org/" target="_blank" rel="noreferrer" className="text-link">
              developercertificate.org<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </span>
        </div>
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
      {titleRuleFails ? (
        <span data-title-rule-fails className="text-sm text-muted-foreground">
          Fix the title to submit: this repo checks it, and a title that fails fails the pull request.
        </span>
      ) : null}
      {signOffMissing ? (
        <span data-dco-missing className="text-sm text-muted-foreground">
          Tick the DCO sign-off to submit: this repo checks every commit for one.
        </span>
      ) : null}
      <Button type="submit" size="lg" disabled={busy || blocked} className="min-h-11.5 font-semibold">
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
