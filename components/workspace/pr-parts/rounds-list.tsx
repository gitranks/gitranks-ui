'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/workspace/copy-button';
import { PageLink } from '@/components/workspace/page-link';
import { ChecksLine } from '@/components/workspace/pr-parts/checks-line';
import { Fold, Replies, type ReplyPresses, SMALL, SMALL_MAIN } from '@/components/workspace/pr-parts/round-replies';
import { cn } from '@/lib/utils';
import { githubUrlOf } from '@/lib/workspace/attempt-format';
import {
  AGENT_NOTE_ASK,
  askedSummaryOf,
  isOpenRound,
  NOT_NEEDED_REASONS,
  NOTE_ASK,
  notNeededLineOf,
  onDayOf,
  type PullRequestLinks,
  ROUND_STATE_WORDS,
  RUN_STOPPED_ASK,
  reopensRounds,
  sendRoundLabelOf,
  sendsOf,
  sentRoundMarkOf,
  startsRounds,
} from '@/lib/workspace/pull-request-page';
import type {
  PullRequestChecks,
  PullRequestPage,
  PullRequestRound,
  PullRequestRoundAsk,
  PullRequestRoundNotNeeded,
} from '@/lib/workspace/pull-request-page.types';

/** What the rounds' buttons do: the page sends each press to the API and draws the page it answers. */
export type RoundPresses = ReplyPresses & {
  onStartRound?: (round: number) => void;
  onSendRound?: (round: number) => void;
  onSendBack?: (round: number) => void;
  onMarkNotNeeded?: (round: number, reason: PullRequestRoundNotNeeded) => void;
  onReopen?: (round: number) => void;
  /** "It does need an answer", on a comment that asks for nothing. */
  onAsks?: (comment: string) => void;
};

export type RoundsListProps = RoundPresses & {
  page: Pick<PullRequestPage, 'rounds' | 'box' | 'hosted' | 'made' | 'checks'>;
  now: Date;
  links?: PullRequestLinks;
  /** The catalogue's states: the round that asks why it is not needed, the rounds drawn open. */
  initialAsking?: number | null;
  initialOpen?: number[];
};

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const PILL_OPEN = 'bg-brand-soft text-brand-soft-foreground';
const PILL_DONE = 'bg-positive/10 text-positive';

/** The first letter as a capital. */
const sentence = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}` : text);

/** "2 commits and 8 replies, sent on 21 Oct.", or "The answer, sent." when the day is not known. */
function sentLineOf(round: PullRequestRound, now: Date): string {
  const day = onDayOf(round.sentAt, now);
  return `${sentence(sendsOf(round) || 'the answer')}, ${day ? `sent ${day}` : 'sent'}.`;
}

/** Gives a round's row the focus. */
const focusRowIn = (list: HTMLElement | null, n: number) =>
  list?.querySelector<HTMLElement>(`[data-round="${n}"]`)?.focus();

/** A closed round's second line, in each state it can be closed in. */
function closedLineOf(round: PullRequestRound, now: Date): string {
  switch (round.state) {
    case 'NOT_NEEDED':
      return notNeededLineOf(round.notNeeded, round.closedBy);
    case 'SENT':
      return sentLineOf(round, now);
    case 'WAITING':
      return 'Not answered yet.';
    case 'WORKING':
      return 'Your agent is working on it.';
    case 'READY': {
      const sends = sendsOf(round);
      return sends ? `Ready to send: ${sends}.` : 'Ready to send.';
    }
    default:
      return '';
  }
}

/**
 * Where a person's words came in: a review, its thread, or the conversation; the person's note went to their agent,
 * and their agent's run stopped without sending.
 */
function placeOf(ask: PullRequestRoundAsk): string {
  switch (ask.kind) {
    case 'changes_requested':
      return `a review with ${ask.comments ?? 1} comment${ask.comments === 1 ? '' : 's'}`;
    case 'conversation':
      return 'in the conversation';
    case NOTE_ASK:
      return 'to your agent';
    case AGENT_NOTE_ASK:
      return 'its note';
    case RUN_STOPPED_ASK:
      return 'stopped without sending';
    default:
      return 'in a review thread';
  }
}

/** The line's own words: the person's note and their agent's run are named so, whatever the line says. */
const whoOf = (ask: PullRequestRoundAsk) =>
  ask.kind === NOTE_ASK
    ? 'Your note'
    : ask.kind === RUN_STOPPED_ASK || ask.kind === AGENT_NOTE_ASK
      ? 'Your agent'
      : ask.author;

/** Lines that are not words on GitHub: no link. */
const OFF_GITHUB: ReadonlySet<string> = new Set([NOTE_ASK, AGENT_NOTE_ASK, RUN_STOPPED_ASK]);

/** What a line's link opens: its comment or review when the link points at it, else the pull request. */
const linkedOf = (ask: PullRequestRoundAsk) =>
  !ask.url.includes('#') ? 'the pull request' : ask.kind === 'changes_requested' ? 'this review' : 'this comment';

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
function AskFigure({ ask, after, id }: { ask: PullRequestRoundAsk; after?: ReactNode; id?: string }) {
  const review = ask.kind === 'changes_requested';
  return (
    <figure
      id={id}
      className={cn(
        'm-0 flex flex-col gap-1 rounded-lg border-l-[3px] bg-muted/40 px-3.5 py-2.5',
        review ? 'border-l-warning' : 'border-l-border',
      )}
      data-ask={ask.kind}
    >
      <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold text-foreground">{whoOf(ask)}</span>
        {review ? (
          <span className={cn(PILL, 'bg-warning-soft text-warning-soft-foreground')}>Asked for changes</span>
        ) : null}
        <span className="text-muted-foreground">{placeOf(ask)}</span>
        {after}
        {OFF_GITHUB.has(ask.kind) ? null : <GitHubLink url={ask.url} what={linkedOf(ask)} />}
      </figcaption>
      {ask.excerpt ? (
        <blockquote className="m-0 line-clamp-3 text-sm text-foreground">“{ask.excerpt}”</blockquote>
      ) : null}
    </figure>
  );
}

/** Words that ask for nothing, each marked so, with "It does need an answer" when the page gives the press. */
function AsksNothing({ asks, onAsks }: { asks: readonly PullRequestRoundAsk[]; onAsks?: (comment: string) => void }) {
  return asks.map((ask, index) => <AskNothing key={`${ask.id ?? ask.author}-${index}`} ask={ask} onAsks={onAsks} />);
}

/** One of them: its button names the words it is about (who, where, what), as several sit one under the other. */
function AskNothing({ ask, onAsks }: { ask: PullRequestRoundAsk; onAsks?: (comment: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <AskFigure
        id={id}
        ask={ask}
        after={<span className={cn(PILL, 'bg-muted text-muted-foreground')}>No answer needed</span>}
      />
      {ask.id && onAsks ? (
        <button
          type="button"
          className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
          aria-describedby={id}
          onClick={() => ask.id && onAsks(ask.id)}
        >
          It does need an answer
        </button>
      ) : null}
    </div>
  );
}

/**
 * The words on the pull request that ask for nothing from before any round was sent, oldest first: listed on the page
 * itself, under the rounds. Nothing without them.
 */
export function SinceOpened({
  since,
  onAsks,
}: {
  since: readonly PullRequestRoundAsk[];
  onAsks?: (comment: string) => void;
}) {
  const id = useId();
  if (!since.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id} data-since-opened="">
      <h2 id={id} className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Since the pull request was opened
      </h2>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <AsksNothing asks={since} onAsks={onAsks} />
      </div>
    </section>
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
  starts,
  onAsk,
  ...presses
}: { round: PullRequestRound; starts: boolean; onAsk: () => void } & RoundPresses) {
  const actions: ReactNode[] = [];
  if (round.state === 'WAITING') {
    if (starts && presses.onStartRound) {
      actions.push(
        <Button key="start" type="button" className={SMALL_MAIN} onClick={() => presses.onStartRound?.(round.n)}>
          Start round {round.n}
        </Button>,
      );
    } else if (!starts && round.prompt) {
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
    <li
      tabIndex={-1}
      className="flex flex-col gap-5 p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-round={round.n}
      data-round-state={round.state}
    >
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
                {round.state === 'SENT' ? sentLineOf(round, now) : sentence(sends || 'no commits')}
              </span>
              {round.commits && links.change ? (
                <PageLink className="text-sm font-semibold text-link hover:underline" href={links.change}>
                  Read the change
                </PageLink>
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
          <AsksNothing asks={round.since} onAsks={presses.onAsks} />
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
          <RoundActions round={round} starts={startsRounds(page)} onAsk={() => setAsking(true)} {...presses} />
        )
      ) : null}
    </li>
  );
}

/** A round drawn as one row: sent, marked as not needed, or an open one the person closed. */
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
  const open = isOpenRound(round);
  const first = round.asked.length ? `${askedSummaryOf(round.asked)}.` : (round.did ?? '');
  const second = closedLineOf(round, now);
  return (
    <li
      tabIndex={-1}
      className="flex flex-col gap-1.5 px-5 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-4"
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
      <span
        className={cn(
          PILL,
          'self-start sm:self-center',
          notNeeded ? 'bg-muted text-muted-foreground' : open ? PILL_OPEN : PILL_DONE,
        )}
      >
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
 * open to show them. Whether a round is open follows the data as it changes, unless the person opened or closed that
 * round themselves. "Mark as not needed" asks why in the buttons' place; the focus then goes back to the round's row.
 */
export function RoundsList({ page, now, links = {}, initialAsking = null, initialOpen, ...presses }: RoundsListProps) {
  const rounds = [...page.rounds].sort((a, b) => b.n - a.n);
  const id = useId();
  // The person's own openings and closings; every other round is open while it is open or has words since.
  const [toggled, setToggled] = useState<ReadonlyMap<number, boolean>>(
    () => new Map((initialOpen ?? []).map((n) => [n, true])),
  );
  const [asking, setAsking] = useState<number | null>(initialAsking);
  const list = useRef<HTMLUListElement>(null);
  // The round whose reason was just picked: its row takes the focus, now and once the page draws the round anew.
  const picked = useRef<number | null>(null);
  useEffect(() => {
    if (picked.current !== null && asking === null) focusRowIn(list.current, picked.current);
  }, [asking]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the rounds changing is what moves the focus again.
  useEffect(() => {
    if (picked.current === null) return;
    focusRowIn(list.current, picked.current);
    picked.current = null;
  }, [page.rounds]);
  if (!rounds.length) return null;
  const isOpen = (round: PullRequestRound) => toggled.get(round.n) ?? (isOpenRound(round) || round.since.length > 0);
  const toggle = (n: number, to: boolean) => setToggled((was) => new Map(was).set(n, to));
  const markNotNeeded = presses.onMarkNotNeeded
    ? (n: number, reason: PullRequestRoundNotNeeded) => {
        picked.current = n;
        presses.onMarkNotNeeded?.(n, reason);
      }
    : undefined;
  const markOf = (round: PullRequestRound) =>
    round.state === 'SENT' ? sentRoundMarkOf(round, page) : ROUND_STATE_WORDS[round.state];
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id} data-rounds="">
      <h2 id={id} className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Rounds with the project
      </h2>
      <ul ref={list} className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rounds.map((round) =>
          isOpen(round) && round.state !== 'NOT_NEEDED' ? (
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
              onMarkNotNeeded={markNotNeeded}
            />
          ) : (
            <ClosedRound
              key={round.n}
              round={round}
              now={now}
              mark={markOf(round)}
              onOpen={() => toggle(round.n, true)}
              onReopen={reopensRounds(page) ? presses.onReopen : undefined}
            />
          ),
        )}
      </ul>
    </section>
  );
}
