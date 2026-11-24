'use client';

import type { Route } from 'next';
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
import { attemptActionErrorMessage, type ContributeActionResult, retryErrorMessage } from '@/lib/workspace/errors';
import { SEND_BACK_NOTE_MAX } from '@/lib/workspace/mcp-setup';
import { requestKeyOf } from '@/lib/workspace/one-comment';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';
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

/** How often the page asks for its read again while a stage is working. */
const REFRESH_MS = 6_000;

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
  /** A walkthrough that waits for another pass can go back to the person's own agent (sends left). */
  walkthroughSendBack: boolean;
  /** The attempt "Try again" starts again; null when nothing can. */
  retryId: string | null;
  /** "Discard this fix", while there is no pull request. */
  discard: boolean;
  /** Replies that did not post, by the run that drafted them. */
  failedReplies: { runId: string; draftIds: string[] } | null;
  /** "Hide its public page", for a pull request whose approval carried that choice. */
  hide: { nameWithOwner: string; number: number } | null;
  /** Where the page comes back to after GitHub's access screen. */
  returnTo: Route;
};

type Form = { kind: 'sendBack'; round: number | null } | { kind: 'rename' } | null;

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
  /** A walkthrough of an older version waits for another pass by the person's agent, read apart. */
  walkthroughBlocked?: { reason: string | null } | null;
}) {
  const router = useRouter();
  // The page a call answered, kept until the next read of the page arrives.
  const [answered, setAnswered] = useState<{ from: PullRequestPage; page: PullRequestPage } | null>(null);
  const page = answered && answered.from === read ? answered.page : read;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [hidden, setHidden] = useState(false);
  const grant = useGrantGithub(ops.returnTo);
  const working = isWorking(page);

  // A run's address opens the page at its round: drawn open, and in view.
  useEffect(() => {
    if (openRound !== null) document.querySelector(`[data-round="${openRound}"]`)?.scrollIntoView({ block: 'start' });
  }, [openRound]);

  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [working, router]);

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
    onRetry: ops.retryId
      ? () =>
          act(
            () => retryAttempt(ops.retryId as string),
            (attempt) => router.push(pullRequestByAttemptPath(attempt.attemptId)),
            retryErrorMessage,
          )
      : undefined,
    onVeto: page.autoSend ? () => act(() => vetoAutopilot(ops.attemptId)) : undefined,
    onOnlyYou,
  };
  // A walkthrough that waits for another pass goes back to the agent from the fix itself; a round, from its run.
  const blocked = page.box === 'WALKTHROUGH' ? walkthroughBlocked : null;
  const backTo = blocked ? (ops.walkthroughSendBack ? ops.attemptId : null) : ops.runId;
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
      {ops.hide && !hidden ? (
        <button
          type="button"
          className="-mt-2 self-start text-xs text-muted-foreground hover:underline"
          disabled={pending}
          data-hide-public-page=""
          onClick={() => {
            const hide = ops.hide;
            if (!hide) return;
            act(
              () => setPrTimeline({ attemptId: ops.attemptId, shown: false, ...hide }),
              () => setHidden(true),
            );
          }}
        >
          Hide its public page
        </button>
      ) : null}
      {fixUrl ? <FixLinkLine url={fixUrl} /> : null}
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
      <PullRequestFootLinks
        rules={page.rules}
        onDiscard={ops.discard && page.number === null ? () => act(() => discardAttempt(ops.attemptId)) : undefined}
      />
    </div>
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
        if (text.trim()) onSubmit(text.trim());
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
        <Button type="submit" className="h-10 px-5 font-semibold max-sm:min-h-11" disabled={pending || !text.trim()}>
          {submit}
        </Button>
        <Button type="button" variant="outline" className="h-10 px-4 max-sm:min-h-11" onClick={onCancel}>
          Keep it as it is
        </Button>
      </div>
    </form>
  );
}
