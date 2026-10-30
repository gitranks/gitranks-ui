import type { Route } from 'next';
import Link from 'next/link';

import { CodeBlock } from './code-block';
import { guessedLineOf, WORK_SETTINGS_PATH } from './first-run-guide';
import { ForgetWelcome } from './forget-welcome';
import { PauseButton } from './pause-button';
import { StillRanking } from './still-ranking';
import { AGENT_WORK_PROMPT } from '@/lib/contribute/agent-connect';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue, ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';
import { agentFirstRunStepOf } from '@/lib/contribute/first-run';
import { KIND_ONE, LANGUAGES } from '@/lib/contribute/format';
import { MCP_CLIENT_NAMES, type McpClient } from '@/lib/contribute/mcp-setup';
import { cn } from '@/lib/utils';

const ISSUES_PATH: Route = '/contribute/issues';

/** How many picks "What your agent sees first" shows. */
export const AGENT_FIRST_PICKS = 3;

const rise =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both';

/** Where each dot of the burst flies, and its colour. */
const BURST = [
  { dx: '-54px', dy: '-30px', tone: 'bg-violet-400' },
  { dx: '50px', dy: '-40px', tone: 'bg-emerald-400' },
  { dx: '58px', dy: '26px', tone: 'bg-violet-600' },
  { dx: '-46px', dy: '40px', tone: 'bg-amber-400' },
  { dx: '0px', dy: '-60px', tone: 'bg-blue-400' },
];

/** B2's top, once, after the own-agent path: a check that draws itself with a small burst. */
export function AgentWelcome({ client }: { client: McpClient }) {
  return (
    <section className="flex flex-wrap items-center gap-6" data-agent-welcome={client}>
      <ForgetWelcome />
      <div aria-hidden="true" className="relative size-22 flex-none">
        {BURST.map(({ dx, dy, tone }) => (
          <span
            key={`${dx}${dy}`}
            className={cn(
              'absolute top-1/2 left-1/2 -m-1 size-2 rounded-full opacity-0 motion-safe:animate-contribute-burst motion-reduce:hidden',
              tone,
            )}
            style={{ '--dx': dx, '--dy': dy } as React.CSSProperties}
          />
        ))}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-green-700 shadow-[0_12px_32px_rgba(21,128,61,0.3)] motion-safe:animate-contribute-pop">
          <svg
            aria-hidden="true"
            className="size-11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.8}
          >
            <path
              d="M5 12l5 5 9-10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="motion-safe:animate-contribute-draw motion-safe:[stroke-dasharray:40] motion-safe:[stroke-dashoffset:40]"
            />
          </svg>
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-1.5">
        <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">Your agent is connected</h1>
        <p className="text-foreground/80">
          {MCP_CLIENT_NAMES[client]} called GitRanks a moment ago. It can already see the issues picked for you.
        </p>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: '1 · your agent claims an issue',
    text: "It's held for you 24 hours from your agent's last step, and 7 days at most. Nobody else gets it meanwhile.",
  },
  {
    title: '2 · it hands back the patch',
    text: 'The review shows up here, at the top of Overview, as soon as it arrives.',
  },
  {
    title: '3 · you approve it',
    text: 'The first time, GitHub asks you for one permission. Then the PR opens in your name.',
  },
];

/** "kind · language · size", what is known of it. */
const factsOf = (issue: ContributeIssue) =>
  [
    issue.kind ? KIND_ONE[issue.kind] : null,
    issue.language ? LANGUAGES[issue.language] : null,
    issue.size ? `size ${issue.size}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

function FirstPick({ issue }: { issue: ContributeIssue }) {
  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);
  const facts = factsOf(issue);
  return (
    <article data-issue={issue.issueId} className="flex min-w-0 flex-col gap-2 rounded-[14px] border bg-card p-4">
      <span className="truncate font-mono text-[13px] text-muted-foreground">
        {issue.nameWithOwner} · #{issue.number}
      </span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
          {title}
        </a>
      ) : (
        <span className="font-semibold">{title}</span>
      )}
      {facts ? <span className="text-[13px] text-muted-foreground">{facts}</span> : null}
    </article>
  );
}

function PicksNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-dashed px-5 py-6 text-center">
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * "What your agent sees first": the top of the feed. While the first picks are being ranked (no `computedAt`), it says
 * so and fills in once they are. `page` is `undefined` when the API does not answer the feed.
 */
export function AgentFirstPicks({ page }: { page: ContributeIssuePage | null | undefined }) {
  let body: React.ReactNode;
  if (page === undefined) {
    body = <PicksNote title="Issues are not available yet" text="The feed is coming soon. Check back shortly." />;
  } else if (page && !page.computedAt) {
    body = <StillRanking />;
  } else if (!page?.items.length) {
    body = (
      <PicksNote
        title="No issues picked for you yet"
        text="New picks arrive every day. Your agent finds them as soon as they do."
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-3">
        {page.items.slice(0, AGENT_FIRST_PICKS).map((issue) => (
          <FirstPick key={issue.issueId} issue={issue} />
        ))}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="agent-first-picks"
      className={cn('flex flex-col gap-3', rise, 'motion-safe:delay-1100')}
      data-agent-picks={page === undefined ? 'unavailable' : page && !page.computedAt ? 'ranking' : 'ready'}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="agent-first-picks" className="text-lg font-bold">
          What your agent sees first
        </h2>
        <Link href={ISSUES_PATH} prefetch={false} className="text-sm font-semibold text-primary">
          All issues for you →
        </Link>
      </div>
      {body}
    </section>
  );
}

/**
 * B2's "What happens next" for a user whose own agent has made no attempt yet: the prompt that starts one, the three
 * steps, and what we guessed. On Overview and Issues as on the welcome.
 */
export function AgentNextSteps({
  view,
  client,
  heading: Heading = 'h2',
}: {
  view: ContributeView;
  /** The client picked on the way in; none outside the welcome. */
  client?: McpClient;
  heading?: 'h1' | 'h2';
}) {
  const agent = client ? MCP_CLIENT_NAMES[client] : 'your agent';
  // Only the user's pause holds the agent's claim; its notice is left out beside this, the rest stay.
  const paused = agentFirstRunStepOf(view).kind === 'paused';
  return (
    <section
      aria-labelledby="agent-next-title"
      data-agent-next
      className={cn(
        'flex flex-col gap-[18px] rounded-[18px] border border-violet-200 bg-violet-50/40 p-[18px] sm:p-6 dark:border-violet-900 dark:bg-violet-950/20',
        rise,
        'motion-safe:delay-900',
      )}
    >
      <Heading id="agent-next-title" className="text-xl font-extrabold">
        What happens next
      </Heading>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Ask your agent, whenever you have a moment:</span>
        <CodeBlock label={`Prompt for ${agent}`} copyLabel="Copy the prompt" wrap>
          {AGENT_WORK_PROMPT}
        </CodeBlock>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3.5">
        {STEPS.map(({ title, text }, index) =>
          index === 0 && paused ? (
            <li
              key={title}
              data-step="1"
              data-agent-step="paused"
              className="flex flex-col gap-1.5 rounded-[14px] border-2 border-primary bg-background p-4"
            >
              <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">1 · paused by you</span>
              <span className="font-bold">Contributing is paused</span>
              <span className="text-sm text-foreground/80">
                Your agent can&apos;t claim an issue until you resume. Your token and picks are kept.
              </span>
              <div className="flex pt-1 [&>div]:items-start">
                <PauseButton paused />
              </div>
            </li>
          ) : (
            <li
              key={title}
              data-step={index + 1}
              className="flex flex-col gap-1.5 rounded-[14px] border bg-background p-4"
            >
              <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">{title}</span>
              <span className="text-sm text-foreground/80">{text}</span>
            </li>
          ),
        )}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-100 pt-3.5 text-sm dark:border-violet-900/60">
        <span className="text-foreground/80">
          <span className="font-semibold text-foreground">We guessed what you&apos;d like:</span>{' '}
          {guessedLineOf(view, { spend: false })}
        </span>
        <Link href={WORK_SETTINGS_PATH} prefetch={false} className="font-semibold text-primary">
          Change it in Settings →
        </Link>
      </div>
    </section>
  );
}
