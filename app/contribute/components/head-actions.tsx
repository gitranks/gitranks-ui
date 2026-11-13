'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useId, useState, useTransition } from 'react';

import { approveReply, dismissReply } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { CopyButton } from './copy-button';
import { FollowUpNote } from './follow-up-buttons';
import { openRepoRules } from './repo-rules';
import { offOf, useSessionActions } from './session-actions';
import { reducedMotion } from './submit-stepper';
import { useGrantGithub } from './use-grant-github';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionSource } from '@/lib/contribute/comment-actions';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { whereOfThread } from '@/lib/contribute/follow-up-flow';
import { SEND_BACK_NOTE_MAX } from '@/lib/contribute/mcp-setup';
import { replyCopyOf } from '@/lib/contribute/org-access';
import { errorPlaceOf, runBatch, startArgsOf } from '@/lib/contribute/session-head-logic';

/**
 * The move card's client controls: they read the session's actions (one pending state, one error), so a long action
 * keeps every other control off, and its error shows once, in the card.
 */

const BIG = 'min-h-11 px-4 font-semibold';

const ErrorLine = ({ text }: { text: string | null | undefined }) =>
  text ? (
    <p role="alert" className="text-sm text-destructive" data-move-error="">
      {text}
    </p>
  ) : null;

/** The provider's error, in the card, for the card's own sources (the submit's only while its dialog is closed). */
export function CardError({ sources }: { sources: ActionSource[] }) {
  const actions = useSessionActions();
  const error = actions?.error;
  if (!error || !sources.includes(error.source)) return null;
  if (errorPlaceOf(error.source, { dialogOpen: actions?.form?.dialog ?? false }) !== 'card') return null;
  return (
    <p
      role="alert"
      className="text-sm text-destructive"
      data-move-error={error.source}
      data-submit-error={error.source === 'submit' ? '' : undefined}
    >
      {error.text}
    </p>
  );
}

/** Opens the pull request's form: Write the pull request, Try again, Allow GitHub access. Not drawn while it is open. */
export function OpenFormButton({ label, focus = 'title' }: { label: string; focus?: 'title' | 'submit' }) {
  const actions = useSessionActions();
  const form = actions?.form;
  if (!form || form.open) return null;
  return (
    <Button
      type="button"
      size="lg"
      className={BIG}
      disabled={offOf(actions)}
      onClick={() => {
        form.setOpen(true);
        requestAnimationFrame(() => {
          const element = document.getElementById('pr-form');
          if (!element) return;
          element.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
          const target =
            (focus === 'submit' ? element.querySelector<HTMLElement>('button[type="submit"]:not(:disabled)') : null) ??
            element.querySelector<HTMLElement>('input, textarea');
          target?.focus({ preventScroll: true });
        });
      }}
    >
      {label}
    </Button>
  );
}

/** The first attempt's Discard: nothing is submitted, the issue goes back to the pool. */
export function DiscardAttemptButton() {
  const actions = useSessionActions();
  const [open, setOpen] = useState(false);
  if (!actions) return null;
  const busy = actions.discardAttemptState.busy;
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" size="lg" variant="outline" disabled={offOf(actions)} className={BIG}>
          {busy ? 'Discarding…' : 'Discard'}
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Discard this attempt?"
      description="Nothing is submitted, and the issue goes back to the pool. What it cost stays spent."
      action="Discard"
      pendingAction="Discarding…"
      pending={busy}
      onConfirm={() => void actions.discardAttempt()}
    />
  );
}

/** A run's Discard run: nothing is pushed and no reply posted. The main button where pushing cannot work. */
export function DiscardRunButton({ primary = false }: { primary?: boolean }) {
  const actions = useSessionActions();
  const [open, setOpen] = useState(false);
  if (!actions || actions.discardRunState.hidden) return null;
  const busy = actions.discardRunState.busy;
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          size="lg"
          variant={primary ? 'destructive' : 'destructive-outline'}
          disabled={offOf(actions)}
          className={BIG}
        >
          {busy ? 'Discarding…' : 'Discard run'}
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
      title="Discard this run?"
      description="Nothing is pushed and no reply is posted. What it cost stays spent; the comments you did not discard stay waiting on the pull request."
      action="Discard run"
      pendingAction="Discarding…"
      pending={busy}
      onConfirm={() => void actions.discardRun()}
    />
  );
}

/**
 * Push and reply, Push anyway, Post the replies, Push the commits, … again: the run's push, after its confirm. Its label
 * follows what pushing does now (the commits, the replies ticked), unless the card names it (`label`).
 */
export function PushButton({
  commits,
  prNumber,
  flow,
  again = false,
  label: named,
}: {
  commits: number;
  prNumber: number | null;
  flow: boolean;
  again?: boolean;
  label?: string;
}) {
  const actions = useSessionActions();
  const [open, setOpen] = useState(false);
  if (!actions || actions.pushState.hidden) return null;
  const state = actions.pushState;
  const posting = actions.replies?.posting ?? 0;
  const base =
    named ??
    (flow
      ? commits && posting
        ? 'Push and reply'
        : commits
          ? 'Push the commits'
          : 'Post the replies'
      : commits
        ? 'Push the commits'
        : 'Finish the follow-up');
  const label = again ? `${base} again` : base;
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  const title = flow
    ? commits
      ? `Push the fixes to ${pr}?`
      : `Post the replies on ${pr}?`
    : commits
      ? `Push the commits to ${pr}?`
      : 'Finish this follow-up?';
  const description = flow
    ? `This ${actions.replies?.summary ?? 'pushes the new commits'}, publicly on GitHub in your name.`
    : commits
      ? `They are pushed publicly to ${pr} on GitHub, in your name.`
      : 'Nothing is pushed. Its replies are posted only once you approve each one.';
  const error = actions.error?.source === 'push' ? actions.error.text : null;
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <ConfirmDialog
        trigger={
          <Button type="button" size="lg" disabled={offOf(actions, state)} className={BIG}>
            {state.busy ? 'Pushing…' : label}
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        action={label}
        pendingAction="Pushing…"
        pending={state.busy}
        error={error}
        actionVariant="default"
        onConfirm={() => void actions.push()}
      />
      {state.disabled ? (
        <span className="text-sm text-muted-foreground" data-push-disabled="">
          {state.disabled}
        </span>
      ) : null}
    </div>
  );
}

/** What the push resolves: the bots' threads it fixed; people's stay open unless the setting says so. */
export function ResolveLine() {
  const replies = useSessionActions()?.replies;
  if (!replies?.botThreads) return null;
  return (
    <p className="text-sm text-muted-foreground" data-resolve-line="">
      Resolves the {replies.botThreads} bot {replies.botThreads === 1 ? 'thread' : 'threads'} it fixed. People&apos;s
      threads stay open for their reviewer.
    </p>
  );
}

/** The run's people's-threads setting: also resolve people's threads once replied. Saved for the next runs too. */
export function ResolveHumansSetting() {
  const actions = useSessionActions();
  const id = useId();
  const replies = actions?.replies;
  if (!replies || replies.resolveHumansState.hidden || !replies.peopleThreads) return null;
  const error = actions.error?.source === 'setting' ? actions.error.text : null;
  return (
    <div className="flex flex-col gap-1.5" data-resolve-humans="">
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={replies.resolveHumans === true}
          disabled={offOf(actions, replies.resolveHumansState)}
          onCheckedChange={(checked) => void replies.setResolveHumans(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor={id} className="flex flex-col items-start gap-0.5 text-sm font-normal">
          Also resolve people&apos;s threads once replied
          <span className="text-xs text-muted-foreground">
            Off by default: reviewers usually resolve their own. Saved for your next follow-ups.
          </span>
        </Label>
      </div>
      <ErrorLine text={error} />
    </div>
  );
}

/** A note to the agent and the button that starts the run: the next-run card's, "Try run N", or "Start a run anyway". */
export function StartRun({
  card,
  id,
  label,
  defaultNote = '',
  hint,
  noteLabel = 'A note for the agent',
  placeholder = 'Anything it should know? For example: the lint rule is wrong here, fix the test instead.',
  primary = true,
  errorHere = false,
}: {
  card: 'next-run' | 'try-run' | 'anyway';
  id: string;
  label: string;
  defaultNote?: string;
  hint?: string;
  noteLabel?: string;
  placeholder?: string;
  primary?: boolean;
  /** Its `start` error under the button: where no card holds it. */
  errorHere?: boolean;
}) {
  const actions = useSessionActions();
  const [note, setNote] = useState(defaultNote);
  if (!actions) return null;
  const state = card === 'next-run' ? actions.startState : actions.startPlainState;
  if (state.hidden) {
    return state.disabled ? (
      <p role="status" className="text-sm text-warning-soft-foreground" data-start-limit="">
        {state.disabled}
      </p>
    ) : null;
  }
  const error = actions.error?.source === 'start' ? actions.error.text : null;
  return (
    <div className="flex flex-col gap-3" data-start={card}>
      <FollowUpNote
        id={id}
        label={noteLabel}
        placeholder={placeholder}
        value={note}
        onChange={setNote}
        disabled={offOf(actions)}
        hint={hint}
      />
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <Button
          type="button"
          size="lg"
          variant={primary ? 'default' : 'outline'}
          disabled={offOf(actions, state)}
          onClick={() => void actions.start(note, startArgsOf(card, actions.threads))}
          className={`${BIG} self-start`}
        >
          {state.busy ? 'Starting…' : label}
        </Button>
        {state.disabled ? (
          <span className="text-sm text-muted-foreground" data-start-disabled="">
            {state.disabled}
          </span>
        ) : null}
      </div>
      {errorHere ? <ErrorLine text={error} /> : null}
    </div>
  );
}

/** The next-run card's title over the comments it takes now: it follows the choices as they are saved. */
export function AddressTitle({ fallback, byAuthor }: { fallback: string; byAuthor: Record<string, string> }) {
  const actions = useSessionActions();
  const chosen = actions?.threads?.chosen;
  if (!chosen?.length) return <>{fallback}</>;
  const authors = [...new Set(chosen.map((id) => byAuthor[id] ?? 'a reviewer'))];
  const count = `${chosen.length} ${chosen.length === 1 ? 'comment' : 'comments'}`;
  if (authors.length > 3) return <>Address {chosen.length} review comments</>;
  const named = authors.length > 1 ? `${authors.slice(0, -1).join(', ')} and ${authors.at(-1)}` : authors[0];
  return (
    <>
      Address {count} from {named}
    </>
  );
}

/** A run's ready title over what pushing does now: the commits, and the replies ticked. */
export function PushTitle({ commits, fallback }: { commits: number; fallback: string }) {
  const actions = useSessionActions();
  const replies = actions?.replies;
  if (!replies) return <>{fallback}</>;
  const posting = replies.posting;
  const c = `${commits} ${commits === 1 ? 'commit' : 'commits'}`;
  const r = `${posting} ${posting === 1 ? 'reply' : 'replies'}`;
  return (
    <>{commits && posting ? `Push ${c} and post ${r}` : commits ? `Push ${c}` : posting ? `Post ${r}` : fallback}</>
  );
}

/** Send back to my agent: its note in the card, at most a few times a change. */
export function SendBack({ left }: { left: number }) {
  const actions = useSessionActions();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!actions || left <= 0) return null;
  const busy = actions.sendBackState.busy;
  if (!open) {
    return (
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={offOf(actions)}
        onClick={() => setOpen(true)}
        className={BIG}
      >
        Send back to my agent ({left} left)
      </Button>
    );
  }
  return (
    <form
      className="flex basis-full flex-col gap-2"
      data-send-back=""
      onSubmit={(event) => {
        event.preventDefault();
        void actions.sendBack(note);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        What your agent should change
      </label>
      <Textarea
        id={id}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={SEND_BACK_NOTE_MAX}
        rows={4}
        className="field-sizing-fixed rounded-lg text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" size="lg" disabled={offOf(actions) || !note.trim()} className={BIG}>
          {busy ? 'Sending…' : 'Send back to my agent'}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)} disabled={busy} className={BIG}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Allow GitHub access: GitHub's consent, then back to this page. Drawn only where the grant can be given here. */
export function GrantButton({ label, primary = false }: { label: string; primary?: boolean }) {
  const actions = useSessionActions();
  const { grant, pending } = useGrantGithub((usePathname() || '/contribute') as Route);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        size="lg"
        variant={primary ? 'default' : 'outline'}
        disabled={pending || offOf(actions)}
        onClick={() => {
          setError(null);
          try {
            grant();
          } catch {
            setError('GitHub could not be opened. Try again.');
          }
        }}
        className={BIG}
      >
        {pending ? 'Opening GitHub…' : label}
      </Button>
      <ErrorLine text={error} />
    </div>
  );
}

/** "maintainer-mo on normalize-path.ts:3:", then the reply's words: one block per reply, to post by hand. */
const copyAllTextOf = (drafts: ContributeReplyDraft[]) => {
  const blocks = drafts.flatMap((draft) => {
    const { words, copyable } = replyCopyOf(draft);
    if (!copyable || !words.trim()) return [];
    const who = draft.comment ? (draft.comment.author ?? 'A reviewer') : 'On the pull request';
    const where = draft.comment ? whereOfThread(draft.comment) : '';
    return [`${who}${where ? ` on ${where}` : ''}:\n${words.trim()}`];
  });
  return { text: blocks.join('\n\n'), count: blocks.length };
};

/** Copy all N: every reply's words with where it goes, to post on GitHub by hand. */
export function CopyAll({ drafts, primary }: { drafts: ContributeReplyDraft[]; primary: boolean }) {
  const actions = useSessionActions();
  const { text, count } = copyAllTextOf(drafts);
  if (!count) return null;
  return (
    <CopyButton
      text={text}
      label={count === drafts.length ? `Copy all ${count}` : `Copy ${count} of ${drafts.length}`}
      variant={primary ? 'default' : 'outline'}
      disabled={offOf(actions)}
      className={BIG}
    />
  );
}

/** One action over several replies, from its confirm; a partial failure stays in the card with what is left. */
function Several({
  ids,
  trigger,
  title,
  description,
  action,
  pendingAction,
  verb,
  call,
  variant,
}: {
  ids: string[];
  trigger: (props: { disabled: boolean }) => ReactNode;
  title: string;
  description: string;
  action: string;
  pendingAction: string;
  verb: 'Dismissed' | 'Posted';
  call: (id: string) => ReturnType<typeof approveReply>;
  variant: 'default' | 'destructive';
}) {
  const actions = useSessionActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [left, setLeft] = useState(ids);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <ConfirmDialog
        trigger={trigger({ disabled: pending || offOf(actions) }) as never}
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        action={action}
        pendingAction={pendingAction}
        pending={pending}
        actionVariant={variant}
        onConfirm={() =>
          startTransition(async () => {
            const result = await runBatch(left, call, verb);
            setLine(result.line);
            setLeft(result.failed);
            setOpen(false);
            router.refresh();
          })
        }
      />
      <ErrorLine text={line} />
    </div>
  );
}

/** Dismiss several replies: each is never posted and no longer waits for the user. */
export function DismissSeveral({ ids }: { ids: string[] }) {
  return (
    <Several
      ids={ids}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant="outline" disabled={disabled} className={BIG}>
          Dismiss
        </Button>
      )}
      title={ids.length === 1 ? 'Dismiss this reply?' : `Dismiss these ${ids.length} replies?`}
      description="They are not posted, and no longer show as something that needs you. Nothing changes on GitHub."
      action="Dismiss"
      pendingAction="Dismissing…"
      verb="Dismissed"
      call={(id) => dismissReply(id, 'NOT_NEEDED') as never}
      variant="destructive"
    />
  );
}

/** Try all again: the replies a retry can mend, posted again, each as it went before (in its thread, or as a comment). */
export function RetrySeveral({ drafts }: { drafts: ContributeReplyDraft[] }) {
  const comment = new Set(drafts.filter((draft) => draft.asComment === true).map(({ draftId }) => draftId));
  return (
    <Several
      ids={drafts.map(({ draftId }) => draftId)}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant="outline" disabled={disabled} className={BIG}>
          Try all again
        </Button>
      )}
      title={`Post these ${drafts.length} replies again?`}
      description="Each is posted publicly on GitHub in your name, where it went before."
      action="Post them"
      pendingAction="Posting…"
      verb="Posted"
      call={(id) => approveReply(id, comment.has(id))}
      variant="default"
    />
  );
}

/** Post the replies left out of a push: each with words is posted, in turn. */
export function PostSeveral({
  drafts,
  prNumber,
  primary,
}: {
  drafts: ContributeReplyDraft[];
  prNumber: number | null;
  primary: boolean;
}) {
  const ready = drafts.filter((draft) => draft.text.trim());
  if (!ready.length) return null;
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  return (
    <Several
      ids={ready.map(({ draftId }) => draftId)}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant={primary ? 'default' : 'outline'} disabled={disabled} className={BIG}>
          {ready.length === 1 ? 'Post the reply' : `Post ${ready.length} replies`}
        </Button>
      )}
      title={ready.length === 1 ? `Post the reply on ${pr}?` : `Post ${ready.length} replies on ${pr}?`}
      description="Each is posted publicly on GitHub in your name, with the words as drafted."
      action="Post them"
      pendingAction="Posting…"
      verb="Posted"
      call={(id) => approveReply(id, false)}
      variant="default"
    />
  );
}

/** "See the repo's rules": opens the rail's repo rules (M9) and goes to them. */
export function RepoRulesLink() {
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto self-start p-0 max-sm:min-h-11"
      onClick={() => openRepoRules()}
    >
      See the repo&apos;s rules
    </Button>
  );
}
