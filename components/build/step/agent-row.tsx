'use client';

import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { BUILD_MINE_PATH, buildStartPath, buildStepPath, buildTestPath } from '@/lib/build/paths';
import {
  type AgentRow as AgentRowState,
  buildLanguageNameOf,
  CONTINUE_SAY,
  type RowLine,
  standingLineOf,
} from '@/lib/build/step-page';

/*
 * The row under a step's title: a build moves in the agent, so its "button" is the sentence to say there, with Copy.
 * It changes with who reads the page, in place and at one size: a visitor's sentence starts the project; a person's
 * build on this step, past it or before it says "Continue my build" and where the build stands.
 */

/** The small Copy beside the sentence: "Copied" for a moment, told to a screen reader too. */
function CopyChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center justify-center rounded-md border bg-background px-2 py-0.5 text-xs font-medium shadow-xs outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-build-copy=""
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </>
  );
}

/** The line under the row: what the sentence does for this reader, and where to go from here. */
function Line({ line }: { line: RowLine }) {
  return (
    <p className="m-0 min-h-4 text-xs text-muted-foreground" data-build-row-line="">
      {line.text}
      {line.link ? (
        <>
          {' '}
          <Link href={line.link.href} className="font-medium text-link hover:underline">
            {line.link.label}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export function AgentRow({
  row,
  project,
  say: visitorSay,
}: {
  row: AgentRowState;
  project: string;
  /** The sentence a visitor says to start the project. */
  say: string;
}) {
  const links = {
    step: (slug: string) => buildStepPath(project, slug),
    test: buildTestPath(project, 'end', row.kind === 'visitor' ? null : row.language),
    mine: BUILD_MINE_PATH,
  };
  let label: ReactNode;
  let say = CONTINUE_SAY;
  let line: RowLine;
  if (row.kind === 'visitor') {
    label = 'Build it with your own agent';
    say = visitorSay;
    line = {
      text: 'Say this in your agent. It brings in the code of each step, you try it, and GitRanks keeps your place.',
      link: { label: 'Connect your agent', href: buildStartPath(project) },
    };
  } else if (row.kind === 'current') {
    label = 'Your build is on this step';
    line = {
      text: `Your build is in ${buildLanguageNameOf(row.language)}. Say this in your agent to go on from here.`,
      link: { label: 'My builds', href: BUILD_MINE_PATH },
    };
  } else if (row.kind === 'done') {
    label = (
      <span className="inline-flex items-center gap-1.5">
        <CircleCheck className="size-4 shrink-0 text-positive" aria-hidden="true" />
        You passed this step
      </span>
    );
    line = standingLineOf(row.standing, links);
  } else {
    label = 'This step is still to come';
    line = standingLineOf(row.standing, links);
  }
  return (
    <div className="flex flex-col gap-1.5" data-build-agent-row={row.kind}>
      <div className="flex min-h-[46px] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2">
        <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1">
          <code className="min-w-0 truncate font-mono text-[13px]" data-build-say="">
            {say}
          </code>
          <CopyChip text={say} />
        </span>
      </div>
      <Line line={line} />
    </div>
  );
}
