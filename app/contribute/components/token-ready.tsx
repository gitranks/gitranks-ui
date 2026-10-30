'use client';

import { CheckIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { CodeBlock, CopyIcon } from './code-block';
import { Button } from '@/components/ui/button';
import {
  MCP_OS_NAMES,
  MCP_OSES,
  MCP_TOKENS_MAX,
  type McpClient,
  type McpOs,
  mcpClientSetupOf,
  mcpTokenByHandOf,
  mcpTokenSaveOf,
} from '@/lib/contribute/mcp-setup';
import { cn } from '@/lib/utils';

const rise = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400';

/** "Lost it before saving it? Make a new one", and what it does. */
export function MakeNewToken({ onReplace, pending }: { onReplace: () => void; pending: boolean }) {
  return (
    <button
      type="button"
      onClick={onReplace}
      disabled={pending}
      className="min-h-11 px-1 text-left text-sm font-semibold text-link hover:text-link/80 disabled:opacity-50"
    >
      {pending ? 'Making a new one…' : 'Lost it before saving it? Make a new one'}
    </button>
  );
}

/** What making a new one does, and that creating a token never revokes the others. */
export const REPLACE_NOTE = `A new one revokes this token, so only one stays live; run the setup it shows again. Claude Code keeps the token it read when GitRanks was added, so its setup removes that entry first; the other agents read the variable when they start, so restart them. Otherwise, creating a token never revokes the others: up to ${MCP_TOKENS_MAX} stay live, listed in Settings.`;

/**
 * B1b, the token just created, in place: shown whole this once, the line that saves it on this computer (the OS
 * detected, switchable), and the setup for the client picked. The token lives in the page's memory alone.
 */
export function TokenReady({
  token,
  client,
  os,
  detectedOs,
  onOs,
  onDone,
  onReplace,
  replacing = false,
  replaced = false,
  focusOnShow = false,
  byHand: byHandOpen = false,
}: {
  token: string;
  client: McpClient;
  os: McpOs;
  /** The OS the browser told; null until it is read. */
  detectedOs: McpOs | null;
  onOs: (os: McpOs) => void;
  onDone: () => void;
  onReplace: () => void;
  replacing?: boolean;
  /** The token replaces one the agent may hold already: the setup takes the old one out first. */
  replaced?: boolean;
  /** Shown by a button that is gone now: focus moves to the token's status line. */
  focusOnShow?: boolean;
  /** "Keep it out of your shell history" open from the start. */
  byHand?: boolean;
}) {
  const id = useId();
  const [byHand, setByHand] = useState(byHandOpen);
  const save = mcpTokenSaveOf(os, token);
  const manual = mcpTokenByHandOf(os, token);
  const setup = mcpClientSetupOf(client, os, { replacing: replaced });
  const status = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new token is announced, and focused, again.
  useEffect(() => {
    if (focusOnShow) status.current?.focus();
  }, [focusOnShow, token]);

  return (
    <div className="flex flex-col gap-5" data-token-ready>
      <div
        ref={status}
        role="status"
        tabIndex={-1}
        className={cn(
          'flex flex-wrap items-center gap-2.5 rounded-xl bg-positive/10 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 px-3.5 py-3 text-sm text-positive',
          rise,
        )}
      >
        <CheckIcon aria-hidden="true" className="size-4.5" strokeWidth={2.6} />
        <span>
          <span className="font-semibold">Your GitRanks token is ready.</span> We show it only this once.
        </span>
      </div>

      <div className={cn('flex flex-col gap-1.5', rise)}>
        <span className="text-sm font-semibold">Your GitRanks token</span>
        <div className="flex items-center rounded-lg border border-input bg-muted/50 pl-3">
          <code data-token className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
            {token}
          </code>
          <CopyIcon text={token} label="Copy the token" />
        </div>
        <span className="text-xs text-muted-foreground">
          The line below already includes it. Keep a copy only if you&apos;ll set up another computer or agent, and
          treat it like a password.
        </span>
      </div>

      <div className={cn('flex flex-col gap-2', rise, 'motion-safe:delay-120 motion-safe:fill-mode-both')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-sm font-semibold">a · Save the token on this computer</span>
          <fieldset className="inline-flex gap-0.75 rounded-lg bg-muted p-0.75">
            <legend className="sr-only">Your computer</legend>
            {MCP_OSES.map((each) => (
              <button
                key={each}
                type="button"
                aria-pressed={each === os}
                onClick={() => onOs(each)}
                className={cn(
                  'min-h-8 rounded-md px-2.5 text-sm font-semibold transition-colors',
                  each === os
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {MCP_OS_NAMES[each]}
              </button>
            ))}
          </fieldset>
        </div>
        <span className="text-xs text-muted-foreground" data-save-note>
          {detectedOs === os ? `We detected ${MCP_OS_NAMES[os]}. ` : ''}
          {save.note}
        </span>
        <CodeBlock label={save.shell} copyLabel="Copy the command">
          {save.line}
        </CodeBlock>
        <button
          type="button"
          aria-expanded={byHand}
          aria-controls={`${id}-by-hand`}
          onClick={() => setByHand((open) => !open)}
          className="min-h-11 self-start px-0.5 text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Keep it out of your shell history
        </button>
        {byHand ? (
          <div id={`${id}-by-hand`} className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3.5" data-by-hand>
            <span className="text-sm text-foreground/80">{manual.steps}</span>
            {manual.line ? (
              <CodeBlock label={os === 'mac' ? '~/.zshrc' : '~/.bashrc'} file copyLabel="Copy the line">
                {manual.line}
              </CodeBlock>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={cn('flex flex-col gap-2', rise, 'motion-safe:delay-240 motion-safe:fill-mode-both')}>
        <span className="text-sm font-semibold">b · Add GitRanks to {setup.name}</span>
        <span className="text-xs text-muted-foreground">{setup.where}</span>
        <CodeBlock label={setup.label} file={setup.file} copyLabel="Copy the setup">
          {setup.lines}
        </CodeBlock>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex flex-wrap items-center gap-3.5">
          <Button
            type="button"
            size="lg"
            onClick={onDone}
            className="min-h-12 flex-none px-5.5 text-base font-semibold"
          >
            I&apos;ve added it
          </Button>
          <MakeNewToken onReplace={onReplace} pending={replacing} />
        </div>
        <span className="text-xs text-muted-foreground">{REPLACE_NOTE}</span>
      </div>
    </div>
  );
}
