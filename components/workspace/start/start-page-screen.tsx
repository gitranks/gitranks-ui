import { ArrowLeft, CheckIcon, LoaderCircle } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useId } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/workspace/code-block';
import { CopyButton } from '@/components/workspace/copy-button';
import { LearnPill } from '@/components/workspace/learn-pill';
import { HEADING } from '@/components/workspace/primitives';
import { RefChips } from '@/components/workspace/ref-chips';
import { StartRefusal } from '@/components/workspace/start/start-refusal';
import { cn } from '@/lib/utils';
import type { ContributeIssueSize } from '@/lib/workspace/contribute.types';
import { SIZES } from '@/lib/workspace/format';
import { settingsPathOf, startPath, WORKSPACE_ANCHORS } from '@/lib/workspace/paths';
import { startPromptOf } from '@/lib/workspace/start/prompt';
import {
  agentNameOf,
  githubIssueUrlOf,
  lastCallLabel,
  learnStartFixOf,
  startIssueUrlOf,
  startPullRequestPathOf,
  startStepsOpen,
} from '@/lib/workspace/start/start-page';
import type {
  LearnStartConnection,
  StartMode,
  StartPageAttempt,
  StartPageIssueView,
} from '@/lib/workspace/start/start-page.types';
import { startRefusalOf } from '@/lib/workspace/start-refusals';

const card = 'flex flex-col gap-3.5 rounded-2xl bg-card p-4.5 sm:p-5.5';
const activeCard = 'border-2 border-primary';
const idleCard = 'border';
/** A step that comes later: its title and when it shows. */
const laterCard = 'gap-2 border opacity-60';
const link = 'font-semibold text-link hover:underline';
/** A link on its own line: 44px tall on phones. */
const phoneTarget = 'inline-flex items-center max-sm:min-h-11';

/** Each mode's words. */
const WORDS: Record<
  StartMode,
  { title: string; intro: string; connect: string; prompt: string; opens: string; closeIt: string }
> = {
  fix: {
    title: 'Fix this issue',
    intro:
      'Your agent fixes this issue on your computer. You review the change here, then approve the pull request. Nothing reaches GitHub before you approve.',
    connect: 'Once per computer. Your agent works with the plan you already have.',
    prompt: 'In a terminal, in any folder. Your agent forks the project and fixes the issue.',
    opens: 'This issue’s page opens',
    closeIt: 'You can close it: the work shows under Right now on the Contribute tab.',
  },
  lesson: {
    title: 'Fix this issue and learn from it',
    intro:
      'Your agent fixes this issue on your computer and also writes a lesson on the fix. You pass the lesson here, then the pull request opens in your name. Nothing reaches GitHub before you approve.',
    connect: 'Once per computer. Learn works with your own agent and the plan you already have.',
    prompt: 'In a terminal, in any folder. Your agent forks the project, fixes the issue and writes your lesson.',
    opens: 'Your lesson page opens',
    closeIt: 'You can close it: the Learn tab links your lesson as soon as your agent takes the issue.',
  },
};

/** The sentence for an agent that may still hold the tool list from before Learn opened for the account. */
export const RESTART_HINT =
  'Your agent may still have the tool list from before Learn opened for you. If it starts a plain fix, restart it, or reconnect GitRanks in it, then paste the prompt again.';

/** "Small", "Medium": an issue's size as the rows word it; nothing for a size we don't know. */
const sizeNameOf = (size: string | null | undefined): string | null =>
  size && Object.hasOwn(SIZES, size) ? SIZES[size as ContributeIssueSize] : null;

/** What the issue card shows in place of a read, or over it: W3's goal line, and a repo and title it knows. */
export type StartPageCard = { repo?: string; title?: string; goalLine?: ReactNode };

/** The issue: the repo and its Issue chip, language and size, the title, and why it was picked or what for. */
function IssueCard({
  issueRef,
  mode,
  issue,
  card: given,
  goal,
}: {
  issueRef: { repo: string; issue: number };
  mode: StartMode;
  issue: StartPageIssueView | null;
  card?: StartPageCard;
  goal: string | null;
}) {
  const row = issue?.start.issue ?? null;
  const repo = given?.repo ?? row?.repo ?? (issue ? issueRef.repo : null);
  const title = given?.title ?? row?.title ?? null;
  const size = sizeNameOf(row?.size);
  const why = row?.why?.trim();
  const url = issue ? startIssueUrlOf(issue) : githubIssueUrlOf(issueRef.repo, issueRef.issue);
  const goalLine =
    given?.goalLine ??
    (mode === 'lesson' ? (
      goal ? (
        <>
          Your lesson will be written for: {goal} ·{' '}
          <Link href={WORKSPACE_ANCHORS.forLearning} prefetch={false} className={link}>
            Change
          </Link>
        </>
      ) : (
        <>
          Your lesson will be written for a general reader.{' '}
          <Link href={WORKSPACE_ANCHORS.forLearning} prefetch={false} className={link}>
            Set your goal
          </Link>
        </>
      )
    ) : null);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4" data-start-issue={row ? 'read' : 'unread'}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {repo ? (
          <RefChips repo={repo} issue={issueRef.issue} />
        ) : (
          <>
            <span className="text-sm">The issue you picked</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className={cn(link, 'font-mono')}>
              Issue #{issueRef.issue} ↗
            </a>
          </>
        )}
        {row?.language ? <span>{row.language}</span> : null}
        {size ? <span>Size {size.toLowerCase()}</span> : null}
      </div>
      {title ? (
        <span className="font-semibold text-pretty">{title}</span>
      ) : repo ? (
        <span className="font-mono font-semibold break-all">
          {repo}#{issueRef.issue}
        </span>
      ) : null}
      {mode === 'fix' && why ? (
        <span className="text-sm text-muted-foreground" data-why="">
          <span className="sr-only">Why it was picked: </span>
          {why}
        </span>
      ) : null}
      {goalLine ? <span className="text-sm text-muted-foreground">{goalLine}</span> : null}
    </div>
  );
}

/** Lesson mode, when the agent took the issue as a regular fix: what to do, by the attempt's state, and its page. */
function FixMessage({
  attempt,
  href,
  back,
}: {
  attempt: StartPageAttempt;
  /** Its pull request's page. */
  href: Route;
  back: { href: Route; label: string };
}) {
  const { text, pickAnother } = learnStartFixOf(attempt.state);
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
      data-start-fix={attempt.state}
    >
      <p className="text-sm">
        <span className="font-semibold">Your agent took it as a regular fix, without a lesson.</span> {text}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {pickAnother ? (
          <Link href={back.href} prefetch={false} className={cn(link, phoneTarget)}>
            Pick another issue →
          </Link>
        ) : null}
        <Link href={href} prefetch={false} className={cn(link, phoneTarget)}>
          Open it →
        </Link>
      </div>
    </div>
  );
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** What step 3 shows: the connect step first, the wait, a lesson's Fix attempt, the 30 minutes up, or a refusal. */
export type StartPageStage = 'connect' | 'waiting' | 'fix' | 'timeout' | 'refused';

export type StartPageScreenProps = {
  issueRef: { repo: string; issue: number };
  mode: StartMode;
  /** The issue's answer; null: nothing was read (a visitor), and the card draws from `card`. */
  issue: StartPageIssueView | null;
  card?: StartPageCard;
  /** Lesson mode: the saved goal ("TypeScript, Some"); null with none. */
  goal: string | null;
  /** Step 1 done: the agent has called. Null until it has. */
  connection: LearnStartConnection | null;
  /** Step 1's connect steps, while no agent has called. */
  connect: ReactNode;
  /** Lesson mode: the viewer's Fix attempt on the issue, worded in step 3. */
  fix: StartPageAttempt | null;
  /** Lesson mode: the restart sentence under the prompt. */
  restartHint?: boolean;
  /** 30 minutes of the page shown and nothing from the agent. */
  timedOut?: boolean;
  checking?: boolean;
  onCheckAgain?: () => void;
  /** Drawn before "Connect your agent"; the steps after it are then numbered from 2. */
  firstSection?: ReactNode;
  /** The steps after `firstSection` drawn dimmed and inert. */
  locked?: boolean;
  back: { href: Route; label: string };
  /** `flow`: no back link row of its own. */
  frame: 'tabs' | 'flow';
  now?: Date;
};

/**
 * The Start page for one issue: the issue, then three steps. Connect the agent (once), paste one prompt, and the page
 * goes on to the issue's page when the agent takes it. A refusal says why the issue can't be started now and leaves
 * only step 1. In lesson mode the agent also writes a lesson on the fix.
 */
export function StartPageScreen({
  issueRef,
  mode,
  issue,
  card: given,
  goal,
  connection,
  connect,
  fix,
  restartHint = false,
  timedOut = false,
  checking = false,
  onCheckAgain,
  firstSection,
  locked = false,
  back,
  frame,
  now = new Date(),
}: StartPageScreenProps) {
  const id = useId();
  const words = WORDS[mode];
  const refusal = issue ? startRefusalOf(issue, back) : null;
  const open = issue ? startStepsOpen(issue) : true;
  const agent = agentNameOf(connection?.client);
  const waits = !!issue && open && (!!connection || !!fix);
  const issueUrl = issue ? startIssueUrlOf(issue) : githubIssueUrlOf(issueRef.repo, issueRef.issue);
  // A Fix attempt whose pull request is open: no prompt to paste again for this issue.
  const fixDone = !!fix && learnStartFixOf(fix.state).pickAnother;
  const stage: StartPageStage = !open
    ? 'refused'
    : fix
      ? 'fix'
      : waits && timedOut
        ? 'timeout'
        : waits
          ? 'waiting'
          : 'connect';
  const first = firstSection ? 2 : 1;
  const restart = mode === 'lesson' && restartHint;

  const steps = (
    <>
      <section
        aria-labelledby={`${id}-s1`}
        className={cn(card, connection ? idleCard : activeCard)}
        data-start-step="connect"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id={`${id}-s1`} className={HEADING.card}>
            {first} · Connect your agent
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
            <p className="text-sm text-muted-foreground">{words.connect}</p>
            {connect}
          </>
        )}
      </section>

      {open ? (
        <>
          {connection && !fixDone ? (
            <section
              aria-labelledby={`${id}-s2`}
              className={cn(card, stage === 'waiting' ? activeCard : idleCard)}
              data-start-step="prompt"
            >
              <h2 id={`${id}-s2`} className={HEADING.card}>
                {first + 1} · Paste this in {agent}
              </h2>
              <p className="text-sm text-muted-foreground">{words.prompt}</p>
              {/* The page's one copy control is the button under it. */}
              <CodeBlock label="Ask your agent" wrap>
                {startPromptOf(issueUrl, mode)}
              </CodeBlock>
              <CopyButton
                text={startPromptOf(issueUrl, mode)}
                label="Copy the prompt"
                variant="default"
                source={mode === 'lesson' ? 'learn_start_copy' : 'contribute_start_copy'}
                className="self-start px-4 font-semibold max-sm:w-full"
              />
              {restart && !fix ? (
                <p className="max-w-prose text-sm text-muted-foreground" data-start-restart="">
                  {RESTART_HINT}
                </p>
              ) : null}
              {mode === 'lesson' ? (
                <p className="border-t pt-3.5 text-sm text-muted-foreground">
                  Only want the pull request?{' '}
                  <Link href={startPath(issueRef)} prefetch={false} className={link}>
                    Just fix it, no lesson
                  </Link>
                </p>
              ) : null}
            </section>
          ) : (
            <section aria-labelledby={`${id}-s2`} aria-disabled="true" className={cn(card, laterCard)}>
              <h2 id={`${id}-s2`} className={HEADING.card}>
                {first + 1} · Paste one prompt in your agent
              </h2>
              <p className="text-sm text-muted-foreground">
                {fixDone ? 'Not for this issue: pick another one.' : 'Shows when your agent is connected.'}
              </p>
            </section>
          )}

          <section
            aria-labelledby={`${id}-s3`}
            aria-disabled={waits ? undefined : 'true'}
            className={cn(card, !waits ? laterCard : stage === 'fix' || stage === 'timeout' ? activeCard : idleCard)}
            data-start-step="opens"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`${id}-s3`} className={HEADING.card}>
                {first + 2} · {words.opens}
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
                <>
                  <FixMessage attempt={fix} href={startPullRequestPathOf(issueRef, issue)} back={back} />
                  {restart ? (
                    <p className="max-w-prose text-sm text-muted-foreground" data-start-restart="">
                      {RESTART_HINT}
                    </p>
                  ) : null}
                </>
              ) : stage === 'timeout' ? (
                <p className="text-sm" data-start-timeout="">
                  Nothing from your agent yet. Check that it is connected, or paste the prompt again.
                </p>
              ) : (
                <>
                  <p className="max-w-prose text-sm text-muted-foreground">
                    This page moves on by itself when your agent takes the issue, usually within a minute of the prompt.{' '}
                    {words.closeIt}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nothing after a few minutes?{' '}
                    <Link href={settingsPathOf('own-agent')} prefetch={false} className={link}>
                      Check your agent’s connection
                    </Link>{' '}
                    ·{' '}
                    <Link href={back.href} prefetch={false} className={link}>
                      Pick another issue
                    </Link>
                  </p>
                </>
              )}
              {waits && timedOut && onCheckAgain ? (
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
    </>
  );

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5"
      data-start-page={stage}
      data-start-mode={mode}
    >
      {frame === 'tabs' ? (
        <Link
          href={back.href}
          prefetch={false}
          className={cn('flex items-center gap-1 self-start text-sm font-semibold text-link', phoneTarget)}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col items-start gap-2 pb-1">
        {mode === 'lesson' ? <LearnPill /> : null}
        <h1 className={HEADING.page}>{words.title}</h1>
        <p className="max-w-prose text-foreground/80">{words.intro}</p>
      </div>

      <IssueCard issueRef={issueRef} mode={mode} issue={issue} card={given} goal={goal} />

      {refusal ? <StartRefusal copy={refusal} code={issue?.start.refusal ?? ''} /> : null}

      {firstSection}
      {locked ? (
        <div inert className="flex flex-col gap-4 opacity-60 sm:gap-5" data-start-locked="">
          {steps}
        </div>
      ) : (
        steps
      )}
    </div>
  );
}
