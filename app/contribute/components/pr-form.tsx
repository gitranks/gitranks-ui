'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState, useTransition } from 'react';

import { approveAttempt } from '../actions';
import { HEADING } from './primitives';
import { offOf, useSessionActions } from './session-actions';
import { reducedMotion } from './submit-stepper';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';
import {
  footerPreviewOf,
  PR_BODY_MAX,
  PR_TITLE_MAX,
  prBodyPreview,
  prFooterText,
} from '@/lib/contribute/attempt-format';
import type { ContributeDcoMode } from '@/lib/contribute/contribute.types';
import {
  RESUME_PARAM,
  resumeHrefOf,
  savePendingApproval,
  tabStoreOf,
  takePendingApproval,
} from '@/lib/contribute/grant-resume';
import {
  type ChecklistItem,
  type ContributeRepoConventions,
  checklistOf,
  titleBlocks,
} from '@/lib/contribute/pr-conventions';
import { runLong } from '@/lib/contribute/session-head-logic';
import { settingsPathOf } from '@/lib/contribute/settings-paths';
import { cn } from '@/lib/utils';

export type PrFormProps = {
  attemptId: string;
  issueNumber: number;
  repo: string;
  defaultTitle: string;
  defaultBody: string;
  /** The user's login, named as the reviewer in the footer. */
  login: string;
  /** What the API adds after the body (the repo's disclosure sentence, the footer line); absent: `prFooterText`. */
  footer?: string;
  /** The commits carry the gitranks co-author: false on a repo that bans AI trailers; null or absent: not known yet. */
  coAuthored?: boolean | null;
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
  /** The description's pane it opens on; absent: Write. */
  defaultPane?: Pane;
};

type Pane = 'write' | 'preview';

const MARK: Record<ChecklistItem['state'], string> = { ok: '✓', blocked: '✕', todo: '•', info: '·' };
const MARK_LABEL: Record<ChecklistItem['state'], string> = {
  ok: 'Done:',
  blocked: 'Needed before Submit:',
  todo: 'To do:',
  info: 'Note:',
};

/** One row of "Before it opens": the repo's asks, the DCO sign-off, and what GitRanks adds. */
type NeedRow = {
  key: string;
  state: ChecklistItem['state'];
  label: ReactNode;
  detail?: ReactNode;
  /** A link out, after the label. */
  link?: { href: string; text: string } | null;
  /** A link or a button after the label. */
  action?: ReactNode;
  /** In place of the mark: the DCO tick. */
  control?: ReactNode;
  /** The label's own element: a `label` for the tick. */
  labelFor?: string;
  id?: string;
  detailId?: string;
  attrs?: Record<`data-${string}`, string>;
};

function Need({ row }: { row: NeedRow }) {
  const words = (
    <>
      {row.label}
      {row.link ? (
        <>
          {' '}
          <a href={row.link.href} target="_blank" rel="noreferrer" className="text-link">
            {row.link.text}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      ) : null}
    </>
  );
  return (
    <li data-need={row.key} data-state={row.state} id={row.id} {...row.attrs} className="flex gap-2">
      {row.control ?? (
        <span
          aria-hidden
          className={cn(
            'w-3 flex-none text-center text-sm',
            row.state === 'ok'
              ? 'text-positive'
              : row.state === 'blocked'
                ? 'text-destructive'
                : 'text-muted-foreground',
          )}
        >
          {MARK[row.state]}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>
            <span className="sr-only">{MARK_LABEL[row.state]} </span>
            {row.labelFor ? (
              <label htmlFor={row.labelFor} className="cursor-pointer">
                {words}
              </label>
            ) : (
              words
            )}
          </span>
          {row.action}
        </span>
        {row.detail ? (
          <span
            id={row.detailId}
            className={cn(
              'text-xs break-words',
              row.state === 'blocked' ? 'text-destructive' : 'text-muted-foreground',
              row.key === 'changelog' && 'font-mono',
            )}
          >
            {row.detail}
          </span>
        ) : null}
      </span>
    </li>
  );
}

/** A row's own small action, a 44px target on phones. */
const RowButton = ({ children, ...props }: ComponentProps<typeof Button>) => (
  <Button type="button" variant="outline" size="xs" className="max-sm:min-h-11" {...props}>
    {children}
  </Button>
);

/**
 * What Submit waits on, in one line: the title (missing, or failing a rule the repo checks) and the DCO tick. Null
 * when nothing waits. `tokens` names each, in this order, for the line's `data-submit-waits`.
 */
export function submitWaitsOf({
  titleMissing,
  titleRuleFails,
  signOffMissing,
}: {
  titleMissing: boolean;
  titleRuleFails: boolean;
  signOffMissing: boolean;
}): { tokens: string; words: string } | null {
  if (titleMissing && signOffMissing)
    return { tokens: 'title-missing dco', words: 'Add a title and tick the DCO sign-off to submit.' };
  if (titleRuleFails && signOffMissing)
    return { tokens: 'title dco', words: 'Fix the title and tick the DCO sign-off to submit.' };
  if (titleMissing) return { tokens: 'title-missing', words: 'Add a title to submit.' };
  if (titleRuleFails) {
    return {
      tokens: 'title',
      words: "Fix the title to submit: as it is, it would fail the repo's rules on the pull request.",
    };
  }
  if (signOffMissing) {
    return { tokens: 'dco', words: 'Tick the DCO sign-off to submit: this repo checks every commit for one.' };
  }
  return null;
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

/** Up to the top of the page, where the submission's progress shows once it starts. */
const scrollToProgress = () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });

/** The focus on the session's head, which shows the progress, without scrolling to it a second time. */
const focusProgress = () => document.querySelector<HTMLElement>('[data-session-head]')?.focus({ preventScroll: true });

/**
 * The pull request as it will open: an editable title and body (written, or previewed as GitHub gets it), what the
 * repo asks and what GitRanks adds, then Submit (the review card has Discard). On the first one, before GitHub access
 * is connected, Submit asks for it: the approval waits in the tab, GitHub asks, and back here with the access (and the
 * nonce the tab kept) it is sent at once. The submit runs through the session's actions: one pending state with the
 * card's Discard, and its error in the dialog while it is open, else in the card.
 */
export function PrForm({
  attemptId,
  issueNumber,
  repo,
  defaultTitle,
  defaultBody,
  login,
  footer,
  coAuthored = null,
  dcoMode,
  dcoRequired,
  again,
  grantNeeded = false,
  grantConnected = false,
  conventions = null,
  patch = null,
  defaultPane = 'write',
}: PrFormProps) {
  const router = useRouter();
  const actions = useSessionActions();
  const id = useId();
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [pane, setPane] = useState<Pane>(defaultPane);
  const [dco, setDco] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** On the way to GitHub, or back from it with the pull request opening. */
  const [handoff, setHandoff] = useState<'github' | 'opening' | null>(null);
  const [pending, startTransition] = useTransition();
  /** The approval went through: the closing dialog hands the focus to the progress, not back to Submit. */
  const approved = useRef(false);
  const busy = pending || handoff !== null || offOf(actions);
  const submitting = actions?.submitState.busy || pending;
  /** A refusal found here, before any call: the session's error, or the form's own outside a session. */
  const fail = (text: string) => (actions ? actions.fail('submit', text) : setError(text));
  const shownError = actions ? (actions.error?.source === 'submit' ? actions.error.text : null) : error;
  // The card shows the submit's error unless this dialog is open to show it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the form's setter is stable for the session.
  useEffect(() => {
    actions?.setDialog(confirm ? 'submit' : null);
  }, [confirm]);

  const standing = dcoMode === 'STANDING';
  const tail = footer ? footerPreviewOf(footer, body) : { text: prFooterText(login), sentence: false };
  const titleMissing = !title.trim();
  const signOff = signOffOf(dcoRequired, dcoMode, dco);
  // A repo that checks every commit fails an unsigned PR: the tick comes first (or Discard).
  const signOffMissing = dcoRequired === true && !signOff;
  // Only a title that fails a rule the repo checks blocks Submit: everything else is the user's to do or to know.
  const titleRuleFails = !titleMissing && titleBlocks(title, conventions);
  const waits = submitWaitsOf({ titleMissing, titleRuleFails, signOffMissing });
  const needs = checklistOf(conventions, { title, patch });
  const titleNeed = needs.find((item) => item.key === 'title');
  const prefix = conventions?.titlePrefix ?? null;

  const rowOf = (item: ChecklistItem): NeedRow => ({
    key: item.key,
    state: item.state,
    label: item.label,
    detail: item.detail,
    link: item.link ? { href: item.link, text: item.linkText ?? 'Sign here' } : null,
    id: item.key === 'title' ? `${id}-title-rule` : undefined,
    action:
      item.key === 'title' && item.fix && prefix ? (
        <RowButton aria-label={`Add “${prefix}” to the start of the title`} onClick={() => setTitle(item.fix ?? title)}>
          Add “{prefix}”
        </RowButton>
      ) : undefined,
  });

  const settingsLink = (
    <Link href={settingsPathOf('prs')} prefetch={false} className="text-link">
      Change
    </Link>
  );
  const dcoLabel = dcoRequired
    ? 'Sign off the commits (DCO): the repo requires it. I certify the Developer Certificate of Origin for this change.'
    : 'Sign off the commits (DCO), if the repo asks for it. I certify the Developer Certificate of Origin for this change.';
  const dcoRow: NeedRow | null =
    dcoRequired === false
      ? null
      : standing
        ? {
            key: 'dco',
            state: 'ok',
            attrs: { 'data-dco': 'standing' },
            label: dcoRequired
              ? 'Commits signed off (DCO): the repo requires it, and your settings give it.'
              : 'Commits signed off (DCO), as your settings say.',
            action: settingsLink,
          }
        : {
            key: 'dco',
            state: dco ? 'ok' : dcoRequired ? 'blocked' : 'todo',
            attrs: { 'data-dco': dcoRequired ? 'required' : 'ask' },
            label: dcoLabel,
            labelFor: `${id}-dco`,
            control: (
              <Checkbox
                id={`${id}-dco`}
                checked={dco}
                onCheckedChange={(checked) => setDco(checked === true)}
                aria-describedby={`${id}-dco-explained`}
                className="mt-0.5"
              />
            ),
            detailId: `${id}-dco-explained`,
            detail: (
              <span data-dco-explained>
                It adds a Signed-off-by line with your name to each commit: your statement that you wrote this change or
                may submit it under the project&apos;s license.{' '}
                <a href="https://developercertificate.org/" target="_blank" rel="noreferrer" className="text-link">
                  developercertificate.org<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            ),
          };

  const rows: NeedRow[] = [
    ...(titleNeed ? [rowOf(titleNeed)] : []),
    ...(dcoRow ? [dcoRow] : []),
    ...needs.filter((item) => item.key !== 'title').map(rowOf),
    {
      key: 'coauthor',
      state: 'info',
      label:
        coAuthored === false
          ? 'No co-author line: the repo bans AI trailers'
          : 'Each commit names gitranks as co-author',
    },
    {
      key: 'footer',
      state: 'info',
      label: 'A footer line linking gitranks.com, added to every pull request',
      detail: tail.sentence
        ? 'This repo asks AI-written pull requests to say so, in its words above the footer.'
        : null,
      action: <RowButton onClick={() => setPane('preview')}>Preview</RowButton>,
    },
  ];

  /** Sends the approval through the session's actions (or on its own outside one); `then` once it went through. */
  const send = (approval: { title: string; body: string; dco: boolean }, then: () => void) => {
    let ok = false;
    const call = async () => {
      const result = await approveAttempt({ id: attemptId, ...approval });
      ok = result.ok;
      return result;
    };
    const done = actions
      ? actions.submitting(call)
      : runLong(call).then((failure) => {
          setError(failure);
          if (!failure) router.refresh();
        });
    return done.then(() => {
      if (ok) then();
      return ok;
    });
  };

  const approve = () =>
    startTransition(async () => {
      setError(null);
      await send({ title, body, dco: signOff }, () => {
        approved.current = true;
        setConfirm(false);
        scrollToProgress();
      });
    });

  // Keep the approval in the tab, then let GitHub ask for access; it sends the user back here with the nonce.
  const allowAndOpen = () => {
    setError(null);
    const nonce = nonceOf();
    if (!savePendingApproval(tabStoreOf(window), { attemptId, title, body, dco: signOff, nonce })) {
      fail('This browser keeps nothing for the way back. Allow GitHub access in Settings, then submit here.');
      return;
    }
    setHandoff('github');
    signIn(CONTRIBUTE_PROVIDER, { redirectTo: resumeHrefOf(attemptId, nonce) }).catch(() => {
      setHandoff(null);
      fail('GitHub could not be opened. Try again.');
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
    void send({ title: approval.title, body: approval.body, dco: approval.dco }, () => {
      scrollToProgress();
      focusProgress();
    }).then((ok) => {
      if (!ok) setHandoff(null);
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
        if (!waits) setConfirm(true);
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
          aria-invalid={titleNeed?.state === 'blocked' || undefined}
          aria-describedby={titleNeed ? `${id}-title-rule` : undefined}
          className="h-auto rounded-lg py-2 text-sm"
        />
      </div>
      <Tabs value={pane} onValueChange={(value) => setPane(value as Pane)} className="gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={`${id}-body`} className="text-sm font-medium">
            Description
          </label>
          <TabsList aria-label="Description" className="h-8 max-sm:h-11">
            <TabsTrigger value="write" className="max-sm:min-h-11">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="max-sm:min-h-11">
              Preview
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="write" forceMount className="data-[state=inactive]:hidden">
          <Textarea
            id={`${id}-body`}
            name="body"
            rows={11}
            value={body}
            maxLength={PR_BODY_MAX}
            onChange={(event) => setBody(event.target.value)}
            className="field-sizing-fixed resize-y rounded-lg font-mono text-xs leading-normal md:text-xs"
          />
        </TabsContent>
        <TabsContent
          value="preview"
          forceMount
          data-pr-preview
          className="flex flex-col gap-1.5 data-[state=inactive]:hidden"
        >
          <span className="text-xs text-muted-foreground">
            The Markdown GitHub gets, with the footer GitRanks adds.
          </span>
          <div className="flex max-h-72 flex-col gap-2 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs">
            <pre className="whitespace-pre-wrap">{prBodyPreview(body, issueNumber)}</pre>
            <span data-pr-footer className="whitespace-pre-wrap border-t pt-2 text-muted-foreground">
              {tail.text}
            </span>
          </div>
        </TabsContent>
      </Tabs>
      <section data-pr-checklist aria-labelledby={`${id}-checklist`} className="flex flex-col gap-2">
        <h3 id={`${id}-checklist`} className="text-sm font-medium">
          Before it opens
        </h3>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <Need key={row.key} row={row} />
          ))}
        </ul>
      </section>
      {handoff === 'opening' ? (
        <p role="status" data-resume="opening" className="sr-only">
          Opening your PR…
        </p>
      ) : null}
      {!actions && error && !confirm ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={busy || !!waits}
          aria-describedby={waits ? `${id}-waits` : undefined}
          className="min-h-11.5 font-semibold max-sm:w-full"
        >
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
      </div>
      {waits ? (
        <p id={`${id}-waits`} data-submit-waits={waits.tokens} className="text-sm text-muted-foreground">
          {waits.words}
        </p>
      ) : grantNeeded ? (
        <p data-grant-ask className="text-xs text-muted-foreground">
          {again
            ? 'GitHub asks you once more for public_repo. You come back here and the PR opens.'
            : 'GitHub asks you once for one permission, public_repo: to fork the repo, push a branch and open the PR in your name, never on private repos or workflow files. You come back here and the PR opens.'}
        </p>
      ) : null}

      <Dialog open={confirm} onOpenChange={(open) => !submitting && !open && setConfirm(false)}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            if (!approved.current) return;
            event.preventDefault();
            focusProgress();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {grantNeeded ? 'Allow GitHub access and open this pull request?' : 'Submit this pull request?'}
            </DialogTitle>
            <DialogDescription>
              {grantNeeded
                ? `GitHub asks you for public_repo. Then you come back here, and it opens on ${repo} in your name, from your fork, with the title and description as you left them. Revoke the access any time, on GitHub or in Settings.`
                : `It opens on ${repo} in your name, from your fork, with the title and description as you left them.`}
            </DialogDescription>
          </DialogHeader>
          {shownError ? (
            <span role="alert" className="text-sm text-destructive" data-submit-error="">
              {shownError}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => (grantNeeded ? allowAndOpen() : approve())} disabled={busy}>
              {handoff === 'github'
                ? 'Opening GitHub…'
                : submitting
                  ? 'Submitting…'
                  : grantNeeded
                    ? 'Continue to GitHub'
                    : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
