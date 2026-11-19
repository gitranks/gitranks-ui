import { ArrowRight, Clock, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import type { LearnPrState, MyLearnAttempt } from '@/lib/learn/learn.types';
import { attemptTitleOf, type OwnCard, prNumberOf } from '@/lib/learn/learn-home';
import { cn } from '@/lib/utils';
import { eventLabelOf, githubUrlOf, type Tone } from '@/lib/workspace/attempt-format';
import { relativeLabel } from '@/lib/workspace/format';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';

const BUTTON = 'min-h-11 px-5 font-semibold max-sm:w-full';

/** Each own-lesson card's pill, heading, line and button; the working card is headed by the issue's title. */
const CARDS: Record<
  OwnCard,
  { pill: string; tone: Tone; heading: string | null; text: string; action: string | null }
> = {
  working: {
    pill: 'Your agent is working',
    tone: 'violet',
    heading: null,
    text: 'Your lesson opens on its page when the fix passes our checks. Your agent tells you in the terminal too.',
    action: 'Open your lesson page',
  },
  ready: {
    pill: 'Lesson ready',
    tone: 'green',
    heading: 'Your lesson is ready',
    text: 'The fix passed our checks. A few short steps on what was wrong and why the fix works, with a question after each.',
    action: 'Take your lesson',
  },
  blocked: {
    pill: 'Questions need fixing',
    tone: 'amber',
    heading: 'The lesson’s questions need fixing',
    text: 'Send it back and your agent writes them again.',
    action: 'Open your lesson page',
  },
  approve: {
    pill: 'Lesson passed',
    tone: 'green',
    heading: 'You passed. Approve your pull request',
    text: 'It opens from your fork, in your name, once you approve it. Nothing reaches GitHub before that.',
    action: 'Approve the pull request',
  },
  submitting: {
    pill: 'Submitting',
    tone: 'violet',
    heading: 'Opening your pull request…',
    text: 'This takes a minute or two. This page shows it once it is open.',
    action: null,
  },
};

/** "driftwood-js/driftwood · issue #934". */
const issueLineOf = (attempt: Pick<MyLearnAttempt, 'repo' | 'issueNumber'>) =>
  attempt.repo ? `${attempt.repo} · issue #${attempt.issueNumber}` : `Issue #${attempt.issueNumber}`;

function CardTop({ line, href, pill }: { line: string; href: string | null; pill: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-sm break-all text-muted-foreground hover:underline"
        >
          {line} ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="font-mono text-sm break-all text-muted-foreground">{line}</span>
      )}
      {pill}
    </div>
  );
}

/** The newest timeline event, as the attempt page words it: its fixed label and when, never the agent's own words. */
function LatestEvent({ attempt, now }: { attempt: MyLearnAttempt; now?: Date }) {
  const event = attempt.latestEvent;
  if (!event) return null;
  const when = relativeLabel(event.at, now);
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground" data-latest-event={event.state}>
      <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        Latest: {eventLabelOf(event, {})}
        {when ? `, ${when}` : ''}
      </span>
    </p>
  );
}

/**
 * The viewer's own lesson in progress, worded by where it is: the agent working (headed by the issue), the lesson
 * ready, its questions to fix, the pull request to approve, or opening. Each leads to the lesson's page.
 */
export function OwnLessonCard({ attempt, card, now }: { attempt: MyLearnAttempt; card: OwnCard; now?: Date }) {
  const words = CARDS[card];
  const rewriting = attempt.stage === 'AGENT_REWRITING';
  const title = attemptTitleOf(attempt);
  return (
    <section
      aria-labelledby="own-lesson"
      className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-card p-5"
      data-own-lesson={attempt.stage}
      data-own-card={card}
    >
      <CardTop
        line={issueLineOf(attempt)}
        href={githubUrlOf(attempt.issueUrl)}
        pill={<Pill tone={words.tone}>{words.pill}</Pill>}
      />
      <h2 id="own-lesson" className={HEADING.card}>
        {words.heading ?? title}
      </h2>
      {words.heading ? <p className="font-medium">{title}</p> : null}
      {card === 'working' ? <LatestEvent attempt={attempt} now={now} /> : null}
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        {card === 'working' ? <GraduationCap aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
        <span>
          {rewriting ? 'Your agent writes a new fix or a better lesson from what you sent back. ' : ''}
          {words.text}
        </span>
      </p>
      {words.action ? (
        <div className="flex flex-wrap gap-3">
          <Button asChild className={BUTTON}>
            <Link href={pullRequestByAttemptPath(attempt.attemptId)} prefetch={false}>
              {words.action}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** How to give the issue back, under the working card. */
export const CHANGED_YOUR_MIND =
  'Changed your mind? Ask your agent to release the issue. If your agent stops, the claim ends by itself within 24 hours.';

/** The pull request card's words, by the pull request's state. */
const PR_CARDS: Record<LearnPrState, { pill: string; tone: Tone; heading: string; text: string }> = {
  OPEN: {
    pill: 'Lesson passed · pull request open',
    tone: 'green',
    heading: 'Your pull request is open',
    text: 'It opened from your fork, in your name. Its footer links your lesson result, so maintainers can see you understood the fix. Maintainers often take a few days to reply; your agent can answer their comments.',
  },
  MERGED: {
    pill: 'Merged',
    tone: 'violet',
    heading: 'Your pull request was merged',
    text: 'The maintainers took your fix. Your lesson result stays linked from the pull request.',
  },
  CLOSED: {
    pill: 'Closed',
    tone: 'neutral',
    heading: 'Your pull request was closed',
    text: 'The maintainers closed it without merging. That happens; the lesson stays yours.',
  },
};

/** The lesson result's address as the API gives it: a path of ours, or a full https address; nothing else. */
const resultHrefOf = (url: string | null | undefined) =>
  url && (/^\/(?!\/)/.test(url) || url.startsWith('https://')) ? url : null;

/** The viewer's newest Learn pull request: where it stands, and links to it and to their lesson result. */
export function PullRequestCard({ attempt }: { attempt: MyLearnAttempt }) {
  const words = PR_CARDS[attempt.prState ?? 'OPEN'] ?? PR_CARDS.OPEN;
  const prUrl = githubUrlOf(attempt.prUrl);
  const number = prNumberOf(prUrl);
  const line = [attempt.repo, number ? `pull request #${number}` : 'pull request'].filter(Boolean).join(' · ');
  const resultUrl = resultHrefOf(attempt.resultUrl);
  return (
    <section
      aria-labelledby="own-pull-request"
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      data-own-lesson="PR_OPEN"
      data-pr-state={attempt.prState ?? 'OPEN'}
    >
      <CardTop line={line} href={null} pill={<Pill tone={words.tone}>{words.pill}</Pill>} />
      <h2 id="own-pull-request" className={HEADING.card}>
        {words.heading}
      </h2>
      <p className="font-medium">{attemptTitleOf(attempt)}</p>
      <p className="max-w-prose text-sm text-muted-foreground">{words.text}</p>
      <div className="flex flex-wrap gap-3">
        {prUrl ? (
          // Outline: the view's one primary action is the next lesson's Start, below.
          <Button asChild variant="outline" className={BUTTON}>
            <a href={prUrl} target="_blank" rel="noreferrer">
              See the pull request ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        ) : null}
        {resultUrl ? (
          <Button asChild variant="outline" className={cn(BUTTON, 'font-medium')}>
            <a href={resultUrl}>Your lesson result</a>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
