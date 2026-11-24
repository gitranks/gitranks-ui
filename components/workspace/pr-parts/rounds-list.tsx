'use client';

import { ChevronDown, ChevronUp, Pencil, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/workspace/copy-button';
import { ChecksLine } from '@/components/workspace/pr-parts/checks-line';
import { cn } from '@/lib/utils';
import { githubUrlOf } from '@/lib/workspace/attempt-format';
import {
  askedSummaryOf,
  isOpenRound,
  NOT_NEEDED_REASONS,
  notNeededLineOf,
  onDayOf,
  type PullRequestLinks,
  ROUND_STATE_WORDS,
  sendRoundLabelOf,
  sendsOf,
  sentRoundMarkOf,
} from '@/lib/workspace/pull-request-page';
import type {
  PullRequestChecks,
  PullRequestPage,
  PullRequestReply,
  PullRequestRound,
  PullRequestRoundAsk,
  PullRequestRoundNotNeeded,
} from '@/lib/workspace/pull-request-page.types';

/** What the rounds' buttons do: the page sends each press to the API and draws the page it answers. */
export type RoundPresses = {
  onStartRound?: (round: number) => void;
  onSendRound?: (round: number) => void;
  onSendBack?: (round: number) => void;
  onMarkNotNeeded?: (round: number, reason: PullRequestRoundNotNeeded) => void;
  onReopen?: (round: number) => void;
  /** "It does need an answer", on a comment that asks for nothing. */
  onAsks?: (comment: string) => void;
  onReplyLeftOut?: (round: number, reply: string, leftOut: boolean) => void;
  onReplyText?: (round: number, reply: string, text: string) => void;
};

export type RoundsListProps = RoundPresses & {
  page: Pick<PullRequestPage, 'rounds' | 'box' | 'hosted' | 'checks'>;
  now: Date;
  links?: PullRequestLinks;
  /** The catalogue's states: the round that asks why it is not needed, the rounds drawn open. */
  initialAsking?: number | null;
  initialOpen?: number[];
};

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const PILL_OPEN = 'bg-brand-soft text-brand-soft-foreground';
const PILL_DONE = 'bg-positive/10 text-positive';
const FOLD = 'flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left hover:bg-accent';
const SMALL_MAIN = 'h-9 px-4 font-semibold max-sm:min-h-11';
const SMALL = 'h-9 px-4 max-sm:min-h-11';

/** The first letter as a capital. */
const sentence = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}` : text);

/** Where a person's words came in: a review, its thread, or the conversation. */
const placeOf = (ask: PullRequestRoundAsk) =>
  ask.kind === 'changes_requested'
    ? `a review with ${ask.comments ?? 1} comment${ask.comments === 1 ? '' : 's'}`
    : ask.kind === 'conversation'
      ? 'in the conversation'
      : 'in a review thread';

function GitHubLink({ url, what }: { url: string; what: string }) {
  const safe = githubUrlOf(url);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="ms-auto shrink-0 text-xs font-semibold whitespace-nowrap text-link hover:underline"
    >
      GitHub <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens {what} on GitHub)</span>
    </a>
  );
}

/** A person's words: who, where, three lines at most, and a link to GitHub. A review that asks for changes is marked. */
function AskFigure({ ask, after }: { ask: PullRequestRoundAsk; after?: ReactNode }) {
  const review = ask.kind === 'changes_requested';
  return (
    <figure
      className={cn(
        'm-0 flex flex-col gap-1 rounded-lg border-l-[3px] bg-muted/40 px-3.5 py-2.5',
        review ? 'border-l-warning' : 'border-l-border',
      )}
      data-ask={ask.kind}
    >
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold text-foreground">{ask.author}</span>
        {review ? (
          <span className={cn(PILL, 'bg-warning-soft text-warning-soft-foreground')}>Asked for changes</span>
        ) : null}
        <span className="text-muted-foreground">{placeOf(ask)}</span>
        {after}
        <GitHubLink url={ask.url} what={review ? 'this review' : 'this comment'} />
      </figcaption>
      {ask.excerpt ? (
        <blockquote className="m-0 line-clamp-3 text-sm text-foreground">“{ask.excerpt}”</blockquote>
      ) : null}
    </figure>
  );
}

/** A row that opens in place: its name, a line, and what it holds. */
function Fold({
  name,
  line,
  tag,
  children,
  initialOpen = false,
}: {
  name: string;
  line?: string;
  tag?: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className={FOLD}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="text-sm font-semibold text-foreground">{name}</span>
        {tag ? (
          <span className="rounded-full border px-1.5 text-[11px] font-medium text-muted-foreground">{tag}</span>
        ) : null}
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{line ?? ''}</span>
        {open ? (
          <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div id={id} hidden={!open} className="flex flex-col gap-2 ps-3">
        {children}
      </div>
    </div>
  );
}

/** What a round was asked, one by one: people's words in full, a bot folded to one row, checks named. */
function AskedList({ asked, withChecks }: { asked: readonly PullRequestRoundAsk[]; withChecks: boolean }) {
  return (
    <>
      {asked.map((ask, index) => {
        const key = `${ask.kind}-${ask.id ?? ask.author}-${index}`;
        if (ask.kind === 'check_failed') {
          if (withChecks) return null;
          return (
            <p key={key} className="m-0 flex items-center gap-2 text-sm text-foreground">
              <span>
                The check <span className="font-mono text-xs font-semibold">{ask.author}</span> fails.
              </span>
              <GitHubLink url={ask.url} what={ask.author} />
            </p>
          );
        }
        if (ask.bot) {
          return (
            <Fold
              key={key}
              name={ask.author}
              tag="bot"
              line={`${ask.comments ?? 1} comment${ask.comments === 1 ? '' : 's'}`}
            >
              {ask.excerpt ? <p className="m-0 text-sm text-foreground">“{ask.excerpt}”</p> : null}
              <GitHubLink url={ask.url} what={`${ask.author}’s comments`} />
            </Fold>
          );
        }
        return <AskFigure key={key} ask={ask} />;
      })}
    </>
  );
}

/** One reply the agent drafted: edit it, leave it out, or put it back. Only a round that is ready takes edits. */
function ReplyRow({
  reply,
  round,
  editable,
  onReplyLeftOut,
  onReplyText,
}: {
  reply: PullRequestReply;
  round: number;
  editable: boolean;
} & Pick<RoundPresses, 'onReplyLeftOut' | 'onReplyText'>) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply.text);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const icon = 'size-8 text-muted-foreground max-sm:size-11';

  if (editing) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border px-3.5 py-2.5"
        data-reply={reply.id}
        data-reply-state="editing"
      >
        <label className="text-xs text-muted-foreground" htmlFor={`reply-${reply.id}`}>
          Reply to {reply.to}
        </label>
        <Textarea
          ref={field}
          id={`reply-${reply.id}`}
          value={text}
          rows={3}
          onChange={(event) => setText(event.target.value)}
          className="text-sm"
        />
        <span className="flex flex-wrap gap-2">
          <Button
            type="button"
            className={SMALL_MAIN}
            disabled={!text.trim()}
            onClick={() => {
              onReplyText?.(round, reply.id, text.trim());
              setEditing(false);
            }}
          >
            Save the reply
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={SMALL}
            onClick={() => {
              setText(reply.text);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-3',
        reply.leftOut && 'border-dashed',
      )}
      data-reply={reply.id}
      data-reply-state={reply.leftOut ? 'left-out' : 'sent'}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          Reply to {reply.to}
          {reply.leftOut ? (
            <>
              {' · '}
              <span className="font-semibold">will not be sent</span>
            </>
          ) : null}
        </span>
        <span className={cn('text-sm', reply.leftOut ? 'text-muted-foreground line-through' : 'text-foreground')}>
          “{reply.text}”
        </span>
      </div>
      {editable ? (
        <span className="flex shrink-0 items-center gap-1">
          {reply.leftOut ? (
            onReplyLeftOut ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={icon}
                aria-label={`Put back the reply to ${reply.to}`}
                title="Put this reply back"
                onClick={() => onReplyLeftOut(round, reply.id, false)}
              >
                <RotateCcw aria-hidden="true" />
              </Button>
            ) : null
          ) : (
            <>
              {onReplyText ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={icon}
                  aria-label={`Edit the reply to ${reply.to}`}
                  title="Edit this reply"
                  onClick={() => setEditing(true)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
              ) : null}
              {onReplyLeftOut ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={icon}
                  aria-label={`Do not send the reply to ${reply.to}`}
                  title="Do not send this reply"
                  onClick={() => onReplyLeftOut(round, reply.id, true)}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

/** The replies, those to one review folded into one row that opens. */
function Replies({
  round,
  editable,
  ...presses
}: { round: PullRequestRound; editable: boolean } & Pick<RoundPresses, 'onReplyLeftOut' | 'onReplyText'>) {
  const groups = new Map<string, PullRequestReply[]>();
  for (const reply of round.replies) groups.set(reply.to, [...(groups.get(reply.to) ?? []), reply]);
  return (
    <>
      {[...groups].map(([to, replies]) => {
        const rows = replies.map((reply) => (
          <ReplyRow key={reply.id} reply={reply} round={round.n} editable={editable} {...presses} />
        ));
        if (replies.length < 2) return rows;
        const left = replies.filter((reply) => reply.leftOut).length;
        return (
          <Fold
            key={to}
            name={`Replies to ${to}`}
            line={`${replies.length} replies${left ? `, ${left} left out` : ''}`}
          >
            {rows}
          </Fold>
        );
      })}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="m-0 text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

/** The round asks why it is not needed, in the buttons' place. */
function WhyNotNeeded({
  round,
  onPick,
  onKeep,
}: {
  round: number;
  onPick: (reason: PullRequestRoundNotNeeded) => void;
  onKeep: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="flex flex-col gap-2.5 border-t pt-4" data-why-not-needed="">
      <h4 ref={heading} tabIndex={-1} className="m-0 text-sm font-semibold text-foreground outline-none">
        Why is round {round} not needed?
      </h4>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
        aria-label={`Why round ${round} is not needed`}
      >
        {NOT_NEEDED_REASONS.map(({ reason, text }) => (
          <Button
            key={reason}
            type="button"
            variant="outline"
            className="h-9 rounded-full px-3.5 max-sm:min-h-11"
            onClick={() => onPick(reason)}
          >
            {text}
          </Button>
        ))}
        <Button type="button" variant="ghost" className={SMALL} onClick={onKeep}>
          Keep the round
        </Button>
      </fieldset>
    </div>
  );
}

/** A round's actions: its own (the same as the box's), and "Mark as not needed" or "Send it back to your agent". */
function RoundActions({
  round,
  hosted,
  onAsk,
  ...presses
}: { round: PullRequestRound; hosted: boolean; onAsk: () => void } & RoundPresses) {
  const actions: ReactNode[] = [];
  if (round.state === 'WAITING') {
    if (hosted && presses.onStartRound) {
      actions.push(
        <Button key="start" type="button" className={SMALL_MAIN} onClick={() => presses.onStartRound?.(round.n)}>
          Start round {round.n}
        </Button>,
      );
    } else if (!hosted && round.prompt) {
      actions.push(
        <CopyButton key="copy" text={round.prompt} label="Copy the prompt" variant="default" className={SMALL_MAIN} />,
      );
    }
  }
  if (round.state === 'READY') {
    if (presses.onSendRound) {
      actions.push(
        <Button key="send" type="button" className={SMALL_MAIN} onClick={() => presses.onSendRound?.(round.n)}>
          {sendRoundLabelOf(round)}
        </Button>,
      );
    }
    if (presses.onSendBack) {
      actions.push(
        <Button
          key="back"
          type="button"
          variant="outline"
          className={SMALL}
          onClick={() => presses.onSendBack?.(round.n)}
        >
          Send it back to your agent
        </Button>,
      );
    }
  } else if (presses.onMarkNotNeeded) {
    actions.push(
      <Button key="mark" type="button" variant="outline" className={SMALL} onClick={onAsk}>
        Mark as not needed
      </Button>,
    );
  }
  if (!actions.length) return null;
  return <div className="flex flex-wrap items-center gap-2.5 border-t pt-4">{actions}</div>;
}

/** A round drawn open: what was asked, what the agent did, the checks, what came after, and its actions. */
function OpenRound({
  round,
  page,
  now,
  links,
  mark,
  asking,
  setAsking,
  onClose,
  ...presses
}: {
  round: PullRequestRound;
  page: RoundsListProps['page'];
  now: Date;
  links: PullRequestLinks;
  mark: string;
  asking: boolean;
  setAsking: (asking: boolean) => void;
  onClose: () => void;
} & RoundPresses) {
  const open = isOpenRound(round);
  const checks: PullRequestChecks | null = open ? page.checks : null;
  const summary = round.asked.length ? askedSummaryOf(round.asked) : (round.did ?? '');
  const folded = round.state === 'READY' || round.state === 'SENT';
  const sends = sendsOf(round);
  return (
    <li className="flex flex-col gap-5 p-5" data-round={round.n} data-round-state={round.state}>
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="m-0 text-base font-semibold text-foreground">Round {round.n}</h3>
          <span className="text-sm text-muted-foreground">{summary}</span>
        </div>
        <span className={cn(PILL, open ? PILL_OPEN : PILL_DONE)}>{mark}</span>
        <button
          type="button"
          aria-expanded="true"
          aria-label={`Close round ${round.n}`}
          className="inline-grid size-6 shrink-0 place-items-center text-muted-foreground max-sm:size-11"
          onClick={onClose}
        >
          <ChevronUp aria-hidden="true" className="size-4" />
        </button>
      </div>
      {round.asked.length ? (
        <Section title="What was asked">
          {folded ? (
            <Fold name={summary}>
              <AskedList asked={round.asked} withChecks={false} />
            </Fold>
          ) : (
            <AskedList asked={round.asked} withChecks={!!checks} />
          )}
        </Section>
      ) : null}
      {folded && (round.commits || round.did || round.replies.length) ? (
        <Section title="What your agent did">
          <div className="flex flex-col gap-1.5 rounded-lg border px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm text-foreground">
                {round.state === 'SENT'
                  ? `${sentence(sends || 'the answer')}, sent ${onDayOf(round.sentAt, now)}.`
                  : sentence(sends || 'no commits')}
              </span>
              {round.commits && links.change ? (
                <Link className="text-sm font-semibold text-link hover:underline" href={links.change} prefetch={false}>
                  Read the change
                </Link>
              ) : null}
            </div>
            {round.did ? <span className="text-sm text-muted-foreground">{round.did}</span> : null}
          </div>
          <Replies
            round={round}
            editable={round.state === 'READY'}
            onReplyLeftOut={presses.onReplyLeftOut}
            onReplyText={presses.onReplyText}
          />
        </Section>
      ) : null}
      {checks ? (
        <Section title="Checks">
          <ChecksLine checks={checks} />
        </Section>
      ) : null}
      {round.since.length ? (
        <Section title="Since it was sent">
          {round.since.map((ask, index) => (
            <div key={`${ask.id ?? ask.author}-${index}`} className="flex flex-col gap-1.5">
              <AskFigure
                ask={ask}
                after={<span className={cn(PILL, 'bg-muted text-muted-foreground')}>No answer needed</span>}
              />
              {ask.id && presses.onAsks ? (
                <button
                  type="button"
                  className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
                  onClick={() => ask.id && presses.onAsks?.(ask.id)}
                >
                  It does need an answer
                </button>
              ) : null}
            </div>
          ))}
        </Section>
      ) : null}
      {open ? (
        asking && presses.onMarkNotNeeded ? (
          <WhyNotNeeded
            round={round.n}
            onPick={(reason) => {
              setAsking(false);
              presses.onMarkNotNeeded?.(round.n, reason);
            }}
            onKeep={() => setAsking(false)}
          />
        ) : (
          <RoundActions round={round} hosted={page.hosted} onAsk={() => setAsking(true)} {...presses} />
        )
      ) : null}
    </li>
  );
}

/** A round drawn as one row: sent, or marked as not needed. */
function ClosedRound({
  round,
  now,
  mark,
  onOpen,
  onReopen,
}: {
  round: PullRequestRound;
  now: Date;
  mark: string;
  onOpen: () => void;
  onReopen?: (round: number) => void;
}) {
  const notNeeded = round.state === 'NOT_NEEDED';
  const first = round.asked.length ? `${askedSummaryOf(round.asked)}.` : (round.did ?? '');
  const sends = sendsOf(round);
  const second = notNeeded
    ? notNeededLineOf(round.notNeeded)
    : sends
      ? `${sentence(sends)}, sent ${onDayOf(round.sentAt, now)}.`
      : `${sentence(`sent ${onDayOf(round.sentAt, now)}`)}.`;
  return (
    <li
      className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4"
      data-round={round.n}
      data-round-state={round.state}
    >
      <span className="w-18 shrink-0 text-sm font-semibold text-foreground">Round {round.n}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {first ? <span className="text-sm text-foreground">{first}</span> : null}
        <span className="text-sm text-muted-foreground">{second}</span>
        {notNeeded && onReopen ? (
          <button
            type="button"
            className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
            onClick={() => onReopen(round.n)}
          >
            Open it again
          </button>
        ) : null}
      </span>
      <span className={cn(PILL, 'self-start sm:self-center', notNeeded ? 'bg-muted text-muted-foreground' : PILL_DONE)}>
        {mark}
      </span>
      {notNeeded ? null : (
        <button
          type="button"
          aria-expanded="false"
          aria-label={`Open round ${round.n}`}
          className="inline-grid size-6 shrink-0 place-items-center self-end text-muted-foreground max-sm:size-11 sm:self-center"
          onClick={onOpen}
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      )}
    </li>
  );
}

/**
 * "Rounds with the project", newest first. A round is what one answer to the maintainers takes. An open round is drawn
 * open: what was asked (a person's words as three lines at most, a review that asks for changes as one block, a bot
 * folded to one row, the checks), what the agent did, and its actions; the person sends it as a whole, and can edit
 * a reply or leave one out first. A sent round closes to one row; one with words that ask for nothing since stays
 * open to show them. "Mark as not needed" asks why in the buttons' place.
 */
export function RoundsList({ page, now, links = {}, initialAsking = null, initialOpen, ...presses }: RoundsListProps) {
  const rounds = [...page.rounds].sort((a, b) => b.n - a.n);
  const [open, setOpen] = useState<Set<number>>(
    () =>
      new Set(
        initialOpen ?? rounds.filter((round) => isOpenRound(round) || round.since.length).map((round) => round.n),
      ),
  );
  const [asking, setAsking] = useState<number | null>(initialAsking);
  if (!rounds.length) return null;
  const toggle = (n: number, to: boolean) =>
    setOpen((was) => {
      const next = new Set(was);
      if (to) next.add(n);
      else next.delete(n);
      return next;
    });
  const markOf = (round: PullRequestRound) =>
    round.state === 'SENT' ? sentRoundMarkOf(round, page) : ROUND_STATE_WORDS[round.state];
  return (
    <section className="flex flex-col gap-2" aria-labelledby="rounds" data-rounds="">
      <h2 id="rounds" className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Rounds with the project
      </h2>
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rounds.map((round) =>
          open.has(round.n) && round.state !== 'NOT_NEEDED' ? (
            <OpenRound
              key={round.n}
              round={round}
              page={page}
              now={now}
              links={links}
              mark={markOf(round)}
              asking={asking === round.n}
              setAsking={(to) => setAsking(to ? round.n : null)}
              onClose={() => toggle(round.n, false)}
              {...presses}
            />
          ) : (
            <ClosedRound
              key={round.n}
              round={round}
              now={now}
              mark={markOf(round)}
              onOpen={() => toggle(round.n, true)}
              onReopen={presses.onReopen}
            />
          ),
        )}
      </ul>
    </section>
  );
}
