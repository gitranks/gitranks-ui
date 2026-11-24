'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useId, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlsoWaiting } from '@/components/workspace/pr-parts/also-waiting';
import { PullRequestFootLinks } from '@/components/workspace/pr-parts/foot-links';
import { PullRequestIssueCard } from '@/components/workspace/pr-parts/issue-card';
import { PullRequestBox, PullRequestOutcomeLine } from '@/components/workspace/pr-parts/pr-box';
import { FixLinkLine, PullRequestCards } from '@/components/workspace/pr-parts/pr-cards';
import { RoundsList, SinceOpened } from '@/components/workspace/pr-parts/rounds-list';
import { StageStrip } from '@/components/workspace/pr-parts/stage-strip';
import { useGrantGithub } from '@/components/workspace/use-grant-github';
import {
  approveRepliesAsOneComment,
  approveReply,
  discardAttempt,
  fixPullRequest,
  retryAttempt,
  sendBackToAgent,
  setPrTimeline,
  startFollowUp,
  vetoAutopilot,
} from '@/lib/workspace/actions';
import { PR_TITLE_MAX } from '@/lib/workspace/attempt-format';
import type { WalkthroughSendBack } from '@/lib/workspace/blocked-walkthrough';
import { attemptActionErrorMessage, type ContributeActionResult, retryErrorMessage } from '@/lib/workspace/errors';
import { FOLLOW_UP_NOTE_MAX } from '@/lib/workspace/follow-up-format';
import { SEND_BACK_NOTE_MAX } from '@/lib/workspace/mcp-setup';
import { requestKeyOf } from '@/lib/workspace/one-comment';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';
import {
  markCommentAsksAction,
  markRoundNotNeededAction,
  reopenRoundAction,
  sendRoundAction,
  setReplyAction,
} from '@/lib/workspace/pull-request.actions';
import type { PullRequestRefInput } from '@/lib/workspace/pull-request.documents';
import { PROOF_ANCHOR, type PullRequestLinks } from '@/lib/workspace/pull-request-page';
import type { PullRequestBox as Box, PullRequestPage } from '@/lib/workspace/pull-request-page.types';
import { useFastChanges } from '@/lib/workspace/use-changes';

/** The boxes in which the agent or GitRanks works: the page moves on by itself then. */
const WORKING: readonly Box[] = ['FIXING', 'WRITING_WALKTHROUGH', 'REWRITING_WALKTHROUGH', 'OPENING', 'ROUND_WORKING'];

/** Whether the page asks for its read again by itself. */
export const isWorking = (page: Pick<PullRequestPage, 'working' | 'box'>) => page.working || WORKING.includes(page.box);

/**
 * Today's calls the page keeps, by what they act on: each is left out (its button with it) when the page has nothing
 * for it to act on.
 */
export type PullRequestOps = {
  /** The fix's first attempt. */
  attemptId: string;
  /** The open pull request, for a hosted round's start. */
  prId: string | null;
  /** The run a round's "Send it back to your agent" goes to. */
  runId: string | null;
  /** Whether a walkthrough that waits for another pass can go back to the person's own agent (a send-back left). */
  walkthroughSendBack: WalkthroughSendBack;
  /** The attempt "Try again" starts again; null when nothing can. */
  retryId: string | null;
  /** "Discard this fix", while there is no pull request. */
  discard: boolean;
  /** Replies that did not post, by the run that drafted them. */
  failedReplies: { runId: string; draftIds: string[] } | null;
  /** The public page's switch, for a pull request whose approval carried that choice: hide it, or show it again. */
  timeline: { nameWithOwner: string; number: number; shown: boolean } | null;
  /** Where the page comes back to after GitHub's access screen. */
  returnTo: Route;
};

type Form = { kind: 'sendBack'; round: number | null } | { kind: 'rename' } | { kind: 'retry' } | null;

/** Gives the focus back to the box's first action once a form in its place closes; its title when it has none. */
function focusBox() {
  requestAnimationFrame(() => {
    const action = document.querySelector<HTMLElement>('[data-box] [data-box-actions] :is(a, button):not([disabled])');
    if (action) return action.focus();
    const title = document.querySelector<HTMLElement>('[data-box] h2');
    if (!title) return;
    title.tabIndex = -1;
    title.focus();
  });
}

/**
 * The pull request's page, one for Learn and Contribute: the issue's card, the strip, the box and its one action,
 * what else waits, the two cards, the rounds and the rules' line. Each press goes to the API and the page draws what it
 * answers; while a stage works, the page reads itself again every few seconds.
 */
export function PullRequestPageView({
  page: read,
  now,
  refInput,
  links,
  fixUrl,
  ops,
  openRound = null,
  proof,
  maintainers,
  takeDown,
  walkthroughBlocked = null,
}: {
  page: PullRequestPage;
  now: Date;
  refInput: PullRequestRefInput;
  links: PullRequestLinks;
  /** The fix's public page, once open (Learn). */
  fixUrl: string | null;
  ops: PullRequestOps;
  /** A run's address: the page opens at its round. */
  openRound?: number | null;
  /** Today's proof card, when a bot asks for proof. */
  proof?: ReactNode;
  /** The maintainers' "this PR helped" notes, each to hide or show again. */
  maintainers?: ReactNode;
  /** "Take the walkthrough down", for a Learn fix's public walkthrough. */
  takeDown?: ReactNode;
  /** A walkthrough of an older version waits for another pass by the person's agent, read apart. */
  walkthroughBlocked?: { reason: string | null } | null;
}) {
  const router = useRouter();
  // The page a call answered, kept until the next read of the page arrives.
  const [answered, setAnswered] = useState<{ from: PullRequestPage; page: PullRequestPage } | null>(null);
  const page = answered && answered.from === read ? answered.page : read;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setFormState] = useState<Form>(null);
  const setForm = (next: Form) => {
    setFormState(next);
    if (!next) focusBox();
  };
  // The public page's switch as the person last set it here, until the next read of the page.
  const [shown, setShown] = useState<{ from: PullRequestPage; shown: boolean } | null>(null);
  const timelineShown = shown && shown.from === read ? shown.shown : (ops.timeline?.shown ?? false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const grant = useGrantGithub(ops.returnTo);
  const working = isWorking(page);

  // A run's address opens the page at its round: drawn open, and in view.
  useEffect(() => {
    if (openRound !== null) document.querySelector(`[data-round="${openRound}"]`)?.scrollIntoView({ block: 'start' });
  }, [openRound]);

  // While a stage is working, the workspace's one poll goes fast; it reads this page again when the attempt moves.
  useFastChanges(working);

  /** A call: its error under the box, or what it answered. */
  const act = <T,>(
    call: () => Promise<ContributeActionResult<T>>,
    then: (data: T) => void = () => router.refresh(),
    message: (
      error: Parameters<typeof attemptActionErrorMessage>[0],
      text?: string,
    ) => string = attemptActionErrorMessage,
  ) =>
    startTransition(async () => {
      setError(null);
      const result = await call();
      if (!result.ok) {
        setError(message(result.error, result.message));
        return;
      }
      then(result.data);
    });

  /** A call that answers the page after it: drawn at once; null (not the person's any more) reads the page again. */
  const onPage = (call: () => Promise<ContributeActionResult<PullRequestPage | null>>) =>
    act(call, (next) => {
      if (next) setAnswered({ from: read, page: next });
      else router.refresh();
    });

  const onOnlyYou = (kind: string, which: 'main' | 'alt') => {
    switch (kind) {
      case 'dco':
        if (which === 'alt') return openOnGitHub(page.url);
        return act(() => fixPullRequest({ attemptId: ops.attemptId, kind: 'SIGN_OFF' }));
      case 'co_author':
        return act(() => fixPullRequest({ attemptId: ops.attemptId, kind: 'CO_AUTHOR' }));
      case 'title':
        return setForm({ kind: 'rename' });
      case 'github':
        return grant.grant();
      case 'bot_blocked':
        return document.getElementById(PROOF_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      case 'replies_failed': {
        const failed = ops.failedReplies;
        if (!failed) return router.refresh();
        if (which === 'alt') {
          return act(async () => {
            for (const id of failed.draftIds) {
              const result = await approveReply(id);
              if (!result.ok) return result;
            }
            return { ok: true as const, data: null };
          });
        }
        return act(() => approveRepliesAsOneComment(failed.runId, { draftIds: failed.draftIds }, requestKeyOf()));
      }
      default:
        return openOnGitHub(page.url);
    }
  };

  const presses = {
    onStartRound: ops.prId ? () => act(() => startFollowUp(ops.prId as string)) : undefined,
    onSendRound: (round: number) => onPage(() => sendRoundAction(refInput, round)),
    onRetry: ops.retryId ? () => setForm({ kind: 'retry' }) : undefined,
    onVeto: page.autoSend ? () => act(() => vetoAutopilot(ops.attemptId)) : undefined,
    onOnlyYou,
  };
  // A walkthrough that waits for another pass goes back to the agent from the fix itself, when a send-back is left; a
  // round, from its run.
  const blocked =
    page.box === 'WALKTHROUGH' && walkthroughBlocked
      ? { ...walkthroughBlocked, sendBack: ops.walkthroughSendBack }
      : null;
  const backTo = blocked ? (ops.walkthroughSendBack === 'yes' ? ops.attemptId : null) : ops.runId;
  const discard = () =>
    startTransition(async () => {
      setDiscardError(null);
      const result = await discardAttempt(ops.attemptId);
      if (!result.ok) {
        setDiscardError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });
  const sendBack = backTo ? (round: number | null) => setForm({ kind: 'sendBack', round }) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5" data-pr-page={page.attemptId}>
      <PullRequestIssueCard page={page} lessonHref={links.lesson} backHref={links.back} />
      <StageStrip page={page} />
      <PullRequestBox
        page={page}
        now={now}
        links={links}
        agent={page.agent}
        stoppedAtLimit={page.stoppedAtLimit}
        walkthroughBlocked={blocked}
        pending={pending || grant.pending}
        enterKey={!form}
        {...presses}
        onSendBack={sendBack ? () => sendBack(null) : undefined}
      />
      {form?.kind === 'sendBack' && backTo ? (
        <NoteForm
          title="Send it back to your agent"
          lead={
            blocked
              ? 'Say what to change. Your agent reads it and writes the walkthrough’s questions again.'
              : 'Say what to change. Your agent reads it, changes the round and drafts it again. Nothing is sent before you approve the round.'
          }
          label="What your agent should change"
          submit="Send it back"
          max={SEND_BACK_NOTE_MAX}
          pending={pending}
          onCancel={() => setForm(null)}
          onSubmit={(note) =>
            act(
              () => sendBackToAgent(backTo, note),
              () => {
                setForm(null);
                router.refresh();
              },
            )
          }
        />
      ) : null}
      {form?.kind === 'retry' && ops.retryId ? (
        <NoteForm
          title="Try again"
          lead="Your note comes first: the agent follows it within the rules and limits. You can leave it empty."
          label="A note for the agent"
          submit="Try again"
          max={FOLLOW_UP_NOTE_MAX}
          optional
          pending={pending}
          onCancel={() => setForm(null)}
          onSubmit={(note) => {
            const retryId = ops.retryId;
            if (!retryId) return;
            act(
              () => retryAttempt(retryId, note || undefined),
              (attempt) => router.push(pullRequestByAttemptPath(attempt.attemptId)),
              retryErrorMessage,
            );
          }}
        />
      ) : null}
      {form?.kind === 'rename' ? (
        <NoteForm
          title="Rename the pull request"
          lead="Give it a title that follows the project’s rule. It changes on GitHub at once."
          label="The pull request’s title"
          submit="Rename it"
          max={PR_TITLE_MAX}
          line
          pending={pending}
          onCancel={() => setForm(null)}
          onSubmit={(title) =>
            act(
              () => fixPullRequest({ attemptId: ops.attemptId, kind: 'TITLE', title }),
              () => {
                setForm(null);
                router.refresh();
              },
            )
          }
        />
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive" data-pr-error="">
          {error}
        </p>
      ) : null}
      <PullRequestOutcomeLine outcome={page.outcome} />
      <AlsoWaiting box={page.box} onlyYou={page.onlyYou} onOnlyYou={onOnlyYou} />
      {proof}
      <PullRequestCards page={page} now={now} links={links} />
      {ops.timeline ? (
        <TimelineLine
          pr={ops.timeline}
          shown={timelineShown}
          pending={pending}
          onSwitch={() => {
            const timeline = ops.timeline;
            if (!timeline) return;
            const { nameWithOwner, number } = timeline;
            act(
              () => setPrTimeline({ attemptId: ops.attemptId, shown: !timelineShown, nameWithOwner, number }),
              (result) => {
                setShown({ from: read, shown: result.shown });
                router.refresh();
              },
            );
          }}
        />
      ) : null}
      {fixUrl ? <FixLinkLine url={fixUrl} /> : null}
      {maintainers}
      <RoundsList
        page={page}
        now={now}
        links={links}
        initialOpen={openRound !== null ? [openRound] : undefined}
        onStartRound={presses.onStartRound}
        onSendRound={presses.onSendRound}
        onSendBack={sendBack}
        onMarkNotNeeded={(round, reason) => onPage(() => markRoundNotNeededAction(refInput, round, reason))}
        onReopen={(round) => onPage(() => reopenRoundAction(refInput, round))}
        onAsks={(comment) => onPage(() => markCommentAsksAction(refInput, comment))}
        onReplyLeftOut={(round, reply, leftOut) => onPage(() => setReplyAction(refInput, round, reply, { leftOut }))}
        onReplyText={(round, reply, text) => {
          const leftOut = page.rounds
            .find((each) => each.n === round)
            ?.replies.find((each) => each.id === reply)?.leftOut;
          onPage(() => setReplyAction(refInput, round, reply, { leftOut: leftOut === true, text }));
        }}
      />
      <SinceOpened
        since={page.since ?? []}
        onAsks={(comment) => onPage(() => markCommentAsksAction(refInput, comment))}
      />
      {takeDown}
      <PullRequestFootLinks
        rules={page.rules}
        onDiscard={ops.discard && page.number === null && page.box !== 'OPENING' ? discard : undefined}
        discarding={pending}
        discardError={discardError}
      />
    </div>
  );
}

/**
 * The fix's public page, for a pull request whose approval carried the choice: whether it shows, a link while it does,
 * and the switch to hide it or show it again.
 */
function TimelineLine({
  pr,
  shown,
  pending,
  onSwitch,
}: {
  pr: { nameWithOwner: string; number: number };
  shown: boolean;
  pending: boolean;
  onSwitch: () => void;
}) {
  return (
    <p
      className="-mt-2 m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
      data-public-page={shown ? 'shown' : 'hidden'}
    >
      <span>{shown ? 'Its public page shows how it was made.' : 'Its public page is hidden.'}</span>
      {shown ? (
        <Link
          href={prTimelinePath(pr)}
          prefetch={false}
          className="inline-flex items-center font-medium text-link hover:underline max-sm:min-h-11"
        >
          See it
        </Link>
      ) : null}
      <button
        type="button"
        className="hover:underline disabled:opacity-50 max-sm:min-h-11"
        disabled={pending}
        data-switch-public-page={shown ? 'hide' : 'show'}
        onClick={onSwitch}
      >
        {shown ? 'Hide its public page' : 'Show its public page again'}
      </button>
    </p>
  );
}

/** Opens the pull request on GitHub in a new tab. */
function openOnGitHub(url: string | null) {
  if (url?.startsWith('https://github.com/')) window.open(url, '_blank', 'noopener,noreferrer');
}

/** A short form in the box's place: a note to the agent, or the pull request's new title. */
function NoteForm({
  title,
  lead,
  label,
  submit,
  max,
  line = false,
  optional = false,
  pending,
  onSubmit,
  onCancel,
}: {
  title: string;
  lead: string;
  label: string;
  submit: string;
  max: number;
  /** One line (a title) rather than a note. */
  line?: boolean;
  /** The form goes without any words too (a note the agent may do without). */
  optional?: boolean;
  pending: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const id = useId();
  const field = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);
  return (
    <form
      className="flex flex-col gap-2.5 rounded-xl border bg-card p-5"
      aria-labelledby={id}
      data-note-form=""
      onSubmit={(event) => {
        event.preventDefault();
        if (optional || text.trim()) onSubmit(text.trim());
      }}
    >
      <h2 id={id} className="m-0 text-base font-semibold">
        {title}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">{lead}</p>
      {line ? (
        <Input
          ref={field}
          value={text}
          maxLength={max}
          aria-label={label}
          onChange={(event) => setText(event.target.value)}
        />
      ) : (
        <Textarea
          ref={field}
          value={text}
          maxLength={max}
          rows={4}
          aria-label={label}
          className="field-sizing-fixed rounded-lg text-sm"
          onChange={(event) => setText(event.target.value)}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          className="h-10 px-5 font-semibold max-sm:min-h-11"
          disabled={pending || (!optional && !text.trim())}
        >
          {submit}
        </Button>
        <Button type="button" variant="outline" className="h-10 px-4 max-sm:min-h-11" onClick={onCancel}>
          Keep it as it is
        </Button>
      </div>
    </form>
  );
}
