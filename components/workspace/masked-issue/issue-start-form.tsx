'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EnterKey } from '@/components/workspace/masked-issue/facts';
import { useEnterKey } from '@/components/workspace/masked-issue/use-enter-key';
import { cn } from '@/lib/utils';
import { WORKSPACE_ANCHORS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { startPromptOf } from '@/lib/workspace/start/prompt';

/** How the fix is made, from Learn: with the walkthrough, or the fix alone. */
export type StartWay = 'teach' | 'fix';
/** Which agent makes it, when the person has both. */
export type StartAgent = 'own' | 'hosted';

export type IssueStartFormProps = {
  /** Where the person came from: Learn offers the choice of how; Contribute does not. */
  from: 'learn' | 'contribute';
  /** The issue's page on GitHub, which the prompt names. */
  issueUrl: string;
  /**
   * From Learn, an issue kept for people who are learning: no "How" step, the walkthrough is always on, and one line
   * says so. From Contribute it changes nothing.
   */
  learnOnly?: boolean;
  /** The agents connected now. */
  agents: { own: boolean; hosted: boolean };
  /** The own agent's name, "Claude Code"; null: "your agent". */
  ownName?: string | null;
  /** From Contribute: the person also uses Learn, so one quiet line offers the walkthrough. */
  alsoLearn?: boolean;
  /** The steps that connect an agent, for someone who has none connected yet. */
  connect?: ReactNode;
  /** Pull requests waiting on maintainers, when they are too many to start another; null: room to start. */
  waitingPrs?: number | null;
  /** The prompt was copied already (the catalogue's state). */
  initialCopied?: boolean;
  initialWay?: StartWay;
  initialAgent?: StartAgent;
  /** Each copy of the prompt: the page holds the issue longer, once. */
  onCopy?: () => void;
  /** "Start with the hosted agent". */
  onHostedStart?: () => void;
  /** The hosted agent is being started. */
  hostedSending?: boolean;
};

const TILE =
  'flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border bg-background p-3.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5';
const STEP_TITLE = 'text-sm font-semibold leading-6';
const LINK = 'font-medium text-link hover:underline';

/** One numbered step: its number in a circle, its title, its body; dimmed while it waits for the step before. */
function Step({
  n,
  title,
  waiting = false,
  children,
}: {
  n: number;
  title: string;
  waiting?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn('flex min-w-0 gap-3.5', waiting && 'opacity-50')}
      data-step={n}
      aria-disabled={waiting || undefined}
    >
      <span
        aria-hidden="true"
        className="flex size-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className={cn(STEP_TITLE, 'm-0')}>{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** Two tiles of the same size, one chosen. */
function Tiles<T extends string>({
  label,
  value,
  onChange,
  tiles,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  tiles: { value: T; title: string; text: string }[];
}) {
  const ids = useId();
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className="grid gap-3 sm:grid-cols-2"
    >
      {tiles.map((tile) => (
        <label key={tile.value} htmlFor={`${ids}-${tile.value}`} className={TILE}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <RadioGroupItem id={`${ids}-${tile.value}`} value={tile.value} />
            {tile.title}
          </span>
          <span className="text-[13px] leading-normal text-muted-foreground">{tile.text}</span>
        </label>
      ))}
    </RadioGroup>
  );
}

/** The prompt in a dark box with its copy button, and what happens next under it. */
function PromptBox({
  prompt,
  agentName,
  copied,
  onCopy,
}: {
  prompt: string;
  agentName: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[#0a0a0a] px-4 py-3 font-mono text-sm text-[#fafafa]">
        <span className="min-w-0 flex-[1_1_240px] break-words" data-prompt="">
          {prompt}
        </span>
        <Button
          type="button"
          variant={copied ? 'outline' : 'default'}
          onClick={onCopy}
          className={cn('h-9 font-sans font-semibold max-sm:min-h-11', copied ? 'text-foreground' : 'px-5')}
        >
          {copied ? 'Copy again' : 'Copy the prompt'}
          {copied ? null : <EnterKey />}
        </Button>
      </div>
      {copied ? (
        <p role="status" className="m-0 text-sm font-medium text-foreground">
          Copied. Waiting for {agentName}. The issue is now held for 30 minutes.
        </p>
      ) : (
        <p className="m-0 text-xs text-muted-foreground">
          This page moves on by itself when your agent starts. Nothing reaches GitHub before you approve.
        </p>
      )}
    </>
  );
}

/**
 * "Start fixing it": a form of numbered steps under the full issue, full width, with the brand's border. Its steps
 * follow where the person came from and which agent they have. From Learn the first step is how (with the walkthrough
 * or not), and the hosted agent is not offered, since it has no Learn mode. From Contribute there is no choice of how;
 * a person who also uses Learn gets one quiet line that adds the walkthrough. With no agent connected the first step
 * connects one, and the prompt waits dimmed. When too many pull requests wait for maintainers, the last step says so,
 * with nothing to paste.
 */
export function IssueStartForm({
  from,
  issueUrl,
  learnOnly = false,
  agents,
  ownName = null,
  alsoLearn = false,
  connect = null,
  waitingPrs = null,
  initialCopied = false,
  initialWay,
  initialAgent,
  onCopy,
  onHostedStart,
  hostedSending = false,
}: IssueStartFormProps) {
  const learn = from === 'learn';
  // Kept for learners, from Learn: the walkthrough is always on, with nothing to choose.
  const teachOnly = learn && learnOnly;
  const [chosenWay, setWay] = useState<StartWay>(initialWay ?? (learn ? 'teach' : 'fix'));
  const way: StartWay = teachOnly ? 'teach' : chosenWay;
  const hosted = agents.hosted && !learn;
  const own = agents.own;
  const [agent, setAgent] = useState<StartAgent>(initialAgent ?? (own ? 'own' : 'hosted'));
  const [copied, setCopied] = useState(initialCopied);
  const agentName = ownName ?? 'your agent';
  const prompt = startPromptOf(issueUrl, way === 'teach' ? 'lesson' : 'fix');
  const chosen: StartAgent | null = own && hosted ? agent : own ? 'own' : hosted ? 'hosted' : null;

  // The first copy starts the 30 minutes; a copy after it changes nothing.
  const reported = useRef(initialCopied);
  const copy = () => {
    navigator.clipboard
      ?.writeText(prompt)
      .then(() => {
        setCopied(true);
        if (reported.current) return;
        reported.current = true;
        onCopy?.();
      })
      .catch(() => {});
  };
  const ready = !waitingPrs && chosen !== null;
  useEnterKey(!ready ? null : chosen === 'own' ? copy : hostedSending ? null : (onHostedStart ?? null));

  // A new prompt (the way changed) has not been copied yet.
  const shownPrompt = useRef(prompt);
  useEffect(() => {
    if (shownPrompt.current === prompt) return;
    shownPrompt.current = prompt;
    setCopied(false);
  }, [prompt]);

  const steps: ReactNode[] = [];
  let count = 0;
  const next = () => {
    count += 1;
    return count;
  };
  const change = (
    <Link href={WORKSPACE_PATHS.agent} prefetch={false} className={LINK}>
      Change
    </Link>
  );

  if (learn && !teachOnly) {
    steps.push(
      <Step key="how" n={next()} title="How">
        <Tiles
          label="How"
          value={way}
          onChange={setWay}
          tiles={[
            {
              value: 'teach',
              title: 'Fix it and teach me',
              text: 'Your agent fixes it and writes the walkthrough. You answer a few questions, then send the pull request.',
            },
            {
              value: 'fix',
              title: 'Just fix it',
              text: 'Your agent fixes it. You read the change, then send the pull request.',
            },
          ]}
        />
      </Step>,
    );
  }

  if (!chosen) {
    steps.push(
      <Step key="connect" n={next()} title="Connect your agent">
        {connect}
      </Step>,
      <Step key="wait" n={next()} title="Paste one prompt in your agent" waiting>
        <p className="m-0 text-sm text-muted-foreground">Shows when your agent is connected.</p>
      </Step>,
    );
  } else {
    steps.push(
      <Step key="agent" n={next()} title="Your agent">
        {own && hosted ? (
          <Tiles
            label="Your agent"
            value={agent}
            onChange={setAgent}
            tiles={[
              {
                value: 'own',
                title: 'My own agent',
                text: ownName
                  ? `${ownName}, on your machine. You paste one prompt.`
                  : 'On your machine. You paste one prompt.',
              },
              {
                value: 'hosted',
                title: 'The hosted agent',
                text: 'On your Claude key, up to your caps. You paste nothing.',
              },
            ]}
          />
        ) : own ? (
          <p className="m-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{ownName ?? 'Your agent'}</span> is connected. {change}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">The hosted agent</span>, on your Claude key. It stops at the
            caps you set. {change}
          </p>
        )}
      </Step>,
    );
    const lastTitle = chosen === 'own' ? `Paste this in ${ownName ?? 'your agent'}` : 'Start';
    steps.push(
      <Step key="last" n={next()} title={lastTitle}>
        {waitingPrs ? (
          <p role="status" className="m-0 text-sm font-medium text-foreground">
            {waitingPrs === 1
              ? 'Your pull request is waiting on maintainers. A new one can start when it is merged or closed.'
              : `${waitingPrs} of your pull requests are waiting on maintainers. A new one can start when one is merged or closed.`}{' '}
            <Link href={WORKSPACE_ANCHORS.limitRow} prefetch={false} className={LINK}>
              Change the limit in Settings
            </Link>
          </p>
        ) : chosen === 'own' ? (
          <PromptBox prompt={prompt} agentName={agentName} copied={copied} onCopy={copy} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={hostedSending ? undefined : onHostedStart}
              aria-disabled={hostedSending || undefined}
              className="h-10 px-6 font-semibold aria-disabled:opacity-60 max-sm:min-h-11"
            >
              {hostedSending ? 'Starting…' : 'Start with the hosted agent'}
              {hostedSending ? null : <EnterKey />}
            </Button>
            <span className="text-sm text-muted-foreground">
              It brings you a tested change to review. Nothing reaches GitHub before you approve.
            </span>
          </div>
        )}
      </Step>,
    );
  }

  return (
    <section
      className="flex min-w-0 flex-col gap-5 rounded-xl border-2 border-primary bg-card p-5"
      aria-labelledby="start-fixing-title"
      data-start-form={from}
    >
      <h2 id="start-fixing-title" className="m-0 text-lg font-semibold">
        Start fixing it
      </h2>
      {teachOnly ? (
        <p className="m-0 max-w-[70ch] text-sm text-muted-foreground" data-learn-only="">
          Your agent fixes it and writes the walkthrough. You answer a few questions, then send the pull request. This
          issue is kept for people who are learning, so it always comes with its walkthrough.
        </p>
      ) : null}
      <ol className="m-0 flex list-none flex-col gap-5 p-0">{steps}</ol>
      {!learn && alsoLearn && chosen === 'own' && !waitingPrs ? (
        <p className="m-0 border-t pt-3 text-sm text-muted-foreground" data-walkthrough-line="">
          {way === 'teach' ? 'The walkthrough is added to this fix. ' : 'You also use GitRanks Learn. '}
          <button type="button" className={LINK} onClick={() => setWay(way === 'teach' ? 'fix' : 'teach')}>
            {way === 'teach' ? 'Leave it out' : 'Add the walkthrough to this fix'}
          </button>
        </p>
      ) : null}
    </section>
  );
}
