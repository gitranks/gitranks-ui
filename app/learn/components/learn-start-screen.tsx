'use client';

import { CheckIcon, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';

import { AgentConnect } from '@/app/contribute/components/agent-connect';
import { CodeBlock } from '@/app/contribute/components/code-block';
import { ContributeNotices } from '@/app/contribute/components/contribute-notices';
import { HEADING } from '@/app/contribute/components/primitives';
import { readLearnStartAttempt, readLearnStartIssue } from '@/app/learn/start/actions';
import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import type { ContributeIssueSize, ContributeMcpToken } from '@/lib/contribute/contribute.types';
import { SIZES } from '@/lib/contribute/format';
import type { McpClient } from '@/lib/contribute/mcp-setup';
import { settingsPathOf } from '@/lib/contribute/settings-paths';
import { LEARN_PATH, learnAttemptPath } from '@/lib/learn/learn-path';
import {
  agentNameOf,
  fixAttemptPath,
  githubIssueUrlOf,
  LEARN_ISSUES_PATH,
  type LearnStartConnection,
  type LearnStartRefusalCopy,
  lastCallLabel,
  learnStartFixAttemptOf,
  learnStartFixOf,
  learnStartLessonAttemptOf,
  learnStartPromptOf,
  learnStartRefusalOf,
  learnStartStepsOpen,
} from '@/lib/learn/learn-start';
import type { LearnStartAttempt, LearnStartIssueRow, LearnStartView } from '@/lib/learn/learn-start.types';
import { startLearnStartPoll } from '@/lib/learn/learn-start-poll';
import { cn } from '@/lib/utils';

const card = 'flex flex-col gap-3.5 rounded-2xl bg-card p-4.5 sm:p-5.5';
const activeCard = 'border-2 border-primary';
const idleCard = 'border';
/** A step that comes later: its title and when it shows. */
const laterCard = 'gap-2 border opacity-60';
const link = 'font-semibold text-link hover:underline';

/** "Small", "Medium": an issue's size as Contribute's rows word it; nothing for a size we don't know. */
const sizeNameOf = (size: string | null): string | null =>
  size && Object.hasOwn(SIZES, size) ? SIZES[size as ContributeIssueSize] : null;

/** What step 3 shows: the wait, a Fix attempt's message, or the 30 minutes up. */
export type LearnStartStage = 'connect' | 'waiting' | 'fix' | 'timeout' | 'refused';

/** The issue: its repository, number, language and size, its title (`owner/repo#n` when unread), and the goal. */
function IssueSummary({
  repo,
  number,
  issue,
  goal,
}: {
  repo: string;
  number: number;
  issue: LearnStartIssueRow | null;
  goal: string;
}) {
  const url = githubIssueUrlOf(repo, number);
  const size = sizeNameOf(issue?.size ?? null);
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border bg-card p-4"
      data-learn-start-issue={issue ? 'read' : 'unread'}
    >
      {issue ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-mono break-all text-foreground/80">
              {repo} · #{number}
            </span>
            {issue.language ? <span>{issue.language}</span> : null}
            {size ? <span>Size {size.toLowerCase()}</span> : null}
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-pretty hover:underline">
            {issue.title}
          </a>
        </>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono font-semibold break-all hover:underline"
        >
          {repo}#{number}
        </a>
      )}
      <span className="text-sm text-muted-foreground">Your lesson will be written for: {goal}</span>
    </div>
  );
}

/** Why the issue can't be started now, and where to go: Contribute's own notice for a paused account. */
function Refusal({ copy, code }: { copy: LearnStartRefusalCopy; code: string }) {
  if (copy.kind === 'paused') return <ContributeNotices notices={[{ kind: 'paused' }]} />;
  return (
    <div
      role="status"
      data-learn-start-refusal={code}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
    >
      <p className="max-w-prose text-sm font-medium">{copy.text}</p>
      {copy.action ? (
        <Link href={copy.action.href} prefetch={false} className="text-sm font-semibold text-link">
          {copy.action.label} →
        </Link>
      ) : null}
    </div>
  );
}

/** Step 3 when the agent took the issue in Fix mode: what to do, by the attempt's state, and its Contribute page. */
function FixMessage({ attempt }: { attempt: LearnStartAttempt }) {
  const { text, pickAnother } = learnStartFixOf(attempt.state);
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
      data-learn-start-fix={attempt.state}
    >
      <p className="text-sm">
        <span className="font-semibold">Your agent took it as a regular fix, without a lesson.</span> {text}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {pickAnother ? (
          <Link href={LEARN_ISSUES_PATH} prefetch={false} className={link}>
            Pick another issue →
          </Link>
        ) : null}
        <Link href={fixAttemptPath(attempt.id)} prefetch={false} className={link}>
          Open it on Contribute →
        </Link>
      </div>
    </div>
  );
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export type LearnStartScreenProps = {
  /** `owner/name`. */
  repo: string;
  number: number;
  /** "TypeScript, Some": what the lesson is written for. */
  goal: string;
  view: LearnStartView;
  /** Step 1 done: the agent has called. Null until it has. */
  connection: LearnStartConnection | null;
  /** Step 1's connect steps, while no agent has called. */
  connect: ReactNode;
  /** The viewer's Fix attempt on the issue, worded in step 3. */
  fix: LearnStartAttempt | null;
  /** 30 minutes of the page shown and nothing from the agent. */
  timedOut?: boolean;
  checking?: boolean;
  onCheckAgain: () => void;
  now?: Date;
};

/**
 * Start your own lesson, for one issue: the issue and the goal its lesson is written for, then three steps. Connect
 * the agent (once), paste one prompt, and the page goes on to the lesson page when the agent takes the issue. A
 * refusal says why the issue can't be started now and leaves only step 1.
 */
export function LearnStartScreen({
  repo,
  number,
  goal,
  view,
  connection,
  connect,
  fix,
  timedOut = false,
  checking = false,
  onCheckAgain,
  now = new Date(),
}: LearnStartScreenProps) {
  const id = useId();
  const refusal = learnStartRefusalOf(view);
  const open = learnStartStepsOpen(view);
  const agent = agentNameOf(connection?.client);
  const waits = open && (!!connection || !!fix);
  const stage: LearnStartStage = !open
    ? 'refused'
    : fix
      ? 'fix'
      : waits && timedOut
        ? 'timeout'
        : waits
          ? 'waiting'
          : 'connect';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5" data-learn-start={stage}>
      <Link href={LEARN_PATH} prefetch={false} className="self-start text-sm font-semibold text-link max-sm:py-2.5">
        ← Issues for your own lesson
      </Link>
      <div className="flex flex-col gap-2 pb-1">
        <span className="text-xs font-semibold text-primary">
          {connection ? 'Your agent is connected' : 'About two minutes, once · no Claude key needed'}
        </span>
        <h1 className={HEADING.page}>Start your own lesson</h1>
        <p className="max-w-prose text-foreground/80">
          Your agent fixes this issue on your computer and writes a lesson about it. You take the lesson here, then
          approve the pull request. Nothing reaches GitHub before you approve.
        </p>
      </div>

      <IssueSummary repo={repo} number={number} issue={view.start.issue} goal={goal} />

      {refusal ? <Refusal copy={refusal} code={view.start.refusal ?? ''} /> : null}

      <section
        aria-labelledby={`${id}-s1`}
        className={cn(card, connection ? idleCard : activeCard)}
        data-learn-start-step="connect"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-s1`} className={HEADING.card}>
            1 · Connect your agent
          </h2>
          {connection ? (
            <Pill tone="green">
              <CheckIcon aria-hidden="true" />
              Done
            </Pill>
          ) : null}
        </div>
        {connection ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl bg-positive/10 px-3.5 py-3 text-sm text-positive-strong"
          >
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <span>
              <span className="font-semibold">{capitalized(agent)} is connected.</span>
              {connection.lastCallAt ? ` Its last call was ${lastCallLabel(connection.lastCallAt, now)}.` : null}
            </span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Once per computer. Learn works with your own agent and the plan you already have.
            </p>
            {connect}
          </>
        )}
      </section>

      {open ? (
        <>
          {connection ? (
            <section
              aria-labelledby={`${id}-s2`}
              className={cn(card, stage === 'waiting' ? activeCard : idleCard)}
              data-learn-start-step="prompt"
            >
              <h2 id={`${id}-s2`} className={HEADING.card}>
                2 · Paste this in {agent}
              </h2>
              <p className="text-sm text-muted-foreground">
                In a terminal, in any folder. Your agent forks the project, fixes the issue and writes your lesson.
              </p>
              <CodeBlock label="Ask your agent" copyLabel="Copy the prompt" wrap copySource="learn_start_copy">
                {learnStartPromptOf(repo, number)}
              </CodeBlock>
            </section>
          ) : (
            <section aria-labelledby={`${id}-s2`} aria-disabled="true" className={cn(card, laterCard)}>
              <h2 id={`${id}-s2`} className={HEADING.card}>
                2 · Paste one prompt in your agent
              </h2>
              <p className="text-sm text-muted-foreground">Shows when your agent is connected.</p>
            </section>
          )}

          <section
            aria-labelledby={`${id}-s3`}
            aria-disabled={waits ? undefined : 'true'}
            className={cn(card, !waits ? laterCard : stage === 'fix' || stage === 'timeout' ? activeCard : idleCard)}
            data-learn-start-step="lesson"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`${id}-s3`} className={HEADING.card}>
                3 · Your lesson page opens
              </h2>
              {stage === 'waiting' ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                  Waiting for {agent}
                </span>
              ) : null}
            </div>
            {/* Announced as it changes: the agent took it as a fix, or the wait ran out. */}
            <div aria-live="polite" className="flex flex-col gap-3.5">
              {!waits ? (
                <p className="text-sm text-muted-foreground">As soon as your agent takes the issue.</p>
              ) : stage === 'fix' && fix ? (
                <FixMessage attempt={fix} />
              ) : stage === 'timeout' ? (
                <p className="text-sm" data-learn-start-timeout>
                  Nothing from your agent yet. Check that it is connected, or paste the prompt again.
                </p>
              ) : (
                <>
                  <p className="max-w-prose text-sm text-muted-foreground">
                    This page moves on by itself when your agent takes the issue, usually within a minute of the prompt.
                    You can close it: Learn home and My lessons link your lesson as soon as your agent takes the issue.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nothing after a few minutes?{' '}
                    <Link href={settingsPathOf('own-agent')} prefetch={false} className={link}>
                      Check your agent’s connection
                    </Link>{' '}
                    ·{' '}
                    <Link href={LEARN_ISSUES_PATH} prefetch={false} className={link}>
                      Pick another issue
                    </Link>
                  </p>
                </>
              )}
              {waits && timedOut ? (
                <Button
                  type="button"
                  onClick={onCheckAgain}
                  disabled={checking}
                  className="min-h-11 self-start px-5 font-semibold max-sm:w-full"
                >
                  {checking ? 'Checking…' : 'Check again'}
                </Button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export type LearnStartProps = {
  repo: string;
  number: number;
  goal: string;
  /** The answer the page was rendered with. */
  initial: LearnStartView;
  /** The agent has called already: step 1 is done. */
  connection: LearnStartConnection | null;
  /** For step 1's connect steps. */
  onboarded: boolean;
  tokens: ContributeMcpToken[] | undefined;
  signIn: boolean;
  /** When the server rendered the page. */
  openedAt: string;
};

/**
 * The start page with its state. Step 1's connect steps tell it when the agent has called, and the page asks again
 * whether the issue can be started. Step 3 asks every 5 seconds, while the page is shown, whether the viewer has an
 * attempt on the issue: a Learn attempt takes the page on to its lesson page, a Fix attempt is worded. After 30 minutes
 * of nothing it stops and offers Check again, which asks both again.
 */
export function LearnStart({
  repo,
  number,
  goal,
  initial,
  connection: connectedAtLoad,
  onboarded,
  tokens,
  signIn,
  openedAt,
}: LearnStartProps) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [connection, setConnection] = useState(connectedAtLoad);
  const [fix, setFix] = useState(() => learnStartFixAttemptOf(initial));
  const [timedOut, setTimedOut] = useState(false);
  // A new poll, with its 30 minutes, after each ask of the issue.
  const [round, setRound] = useState(0);
  const [checking, startChecking] = useTransition();
  const gone = useRef(false);

  useEffect(() => {
    reportLearnEvent({ kind: 'learn_view', event: 'learn_start_view', source: 'learn_start' });
  }, []);

  const toLesson = useCallback(
    (attemptId: string) => {
      if (gone.current) return;
      gone.current = true;
      reportLearnEvent({ kind: 'learn_view', event: 'learn_start_claimed', source: 'learn_start' });
      router.replace(learnAttemptPath(attemptId));
    },
    [router],
  );

  const askIssue = useCallback(
    () =>
      startChecking(async () => {
        const result = await readLearnStartIssue(repo, number);
        if (result.ok) {
          const lesson = learnStartLessonAttemptOf(result.data);
          if (lesson) {
            toLesson(lesson.id);
            return;
          }
          setView(result.data);
          setFix(learnStartFixAttemptOf(result.data));
        }
        setTimedOut(false);
        setRound((count) => count + 1);
      }),
    [repo, number, toLesson],
  );

  const onConnected = useCallback(
    (client: McpClient) => {
      setConnection({ client, lastCallAt: new Date().toISOString() });
      askIssue();
    },
    [askIssue],
  );

  const polls = learnStartStepsOpen(view) && (!!connection || !!fix) && !timedOut;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `round` starts a new poll after each ask of the issue.
  useEffect(() => {
    if (!polls) return;
    const poll = startLearnStartPoll(
      async () => {
        const result = await readLearnStartAttempt(repo, number);
        // Offline or a failed read: the next ask tries again. Signed out, or the API without it: nothing to wait for.
        if (!result.ok) return result.error === 'FAILED' ? 'go' : 'stop';
        if (result.data?.mode === 'LEARN') {
          toLesson(result.data.id);
          return 'stop';
        }
        setFix(result.data?.mode === 'FIX' ? result.data : null);
        return 'go';
      },
      () => setTimedOut(true),
      { document },
    );
    return poll.stop;
  }, [polls, round, repo, number, toLesson]);

  return (
    <LearnStartScreen
      repo={repo}
      number={number}
      goal={goal}
      view={view}
      connection={connection}
      connect={
        <AgentConnect
          mode="learn"
          onboarded={onboarded}
          tokens={tokens}
          signIn={signIn}
          openedAt={openedAt}
          onConnected={onConnected}
          connectSource="learn_start"
        />
      }
      fix={fix}
      timedOut={timedOut}
      checking={checking}
      onCheckAgain={askIssue}
      now={new Date(openedAt)}
    />
  );
}
