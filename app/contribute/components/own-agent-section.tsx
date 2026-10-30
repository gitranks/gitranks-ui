'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { createMcpToken, revokeMcpToken } from '../actions';
import { Eyebrow, Panel, PanelTitle } from './primitives';
import type { ContributeMcpToken, ContributeOwnAgent } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel, relativeLabel } from '@/lib/contribute/format';
import {
  exportLineOf,
  MCP_SETUPS,
  MCP_TOKEN_ENV,
  MCP_TOKEN_NAME_MAX,
  MCP_TOKENS_MAX,
  type McpClient,
} from '@/lib/contribute/mcp-setup';
import { cn } from '@/lib/utils';

export const OWN_AGENT_SAFETY = 'Your agent reads issue text written by strangers. Keep its permission prompts on.';

const plainButton =
  'min-h-10 rounded-lg border bg-background px-3.5 text-sm font-medium hover:bg-accent disabled:opacity-50';
const primaryButton =
  'min-h-10 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50';
const dangerButton =
  'min-h-10 rounded-lg border bg-background px-3.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={copy} className={plainButton}>
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-900 px-3.5 py-3 font-mono text-[13px] leading-relaxed text-zinc-200">
      {children}
    </pre>
  );
}

/** The token just created, shown this once, with the line that puts it in the shell's environment. */
function NewToken({ token, onDone }: { token: string; onDone: () => void }) {
  return (
    <div
      data-new-token
      className="flex flex-col gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <p className="text-sm font-semibold">Copy your token now: it is shown only this once.</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all rounded bg-background px-2 py-1 font-mono text-sm">{token}</code>
        <CopyButton text={token} />
      </div>
      <p className="text-sm text-muted-foreground">
        Put it in your shell profile, so your agent reads it from <code className="font-mono">{MCP_TOKEN_ENV}</code>:
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <Code>{exportLineOf(token)}</Code>
        </div>
        <CopyButton text={exportLineOf(token)} />
      </div>
      <div>
        <button type="button" onClick={onDone} className={plainButton}>
          I saved it
        </button>
      </div>
    </div>
  );
}

function TokenRow({ token, now }: { token: ContributeMcpToken; now?: Date }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const revoke = () =>
    startTransition(async () => {
      const result = await revokeMcpToken(token.id);
      setConfirming(false);
      if (!result.ok) {
        setMessage(contributeErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });

  return (
    <li
      data-mcp-token={token.id}
      className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{token.name}</span>
        <span className="text-sm text-muted-foreground">
          {message ?? (
            <>
              <span className="font-mono">gr_…{token.last4}</span> · created {dayLabel(token.createdAt)} ·{' '}
              {token.lastUsedAt ? `last used ${relativeLabel(token.lastUsedAt, now)}` : 'never used'}
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <button type="button" onClick={revoke} disabled={pending} className={dangerButton}>
              {pending ? 'Revoking…' : 'Yes, revoke it'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={plainButton}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={dangerButton}>
            Revoke
          </button>
        )}
      </div>
    </li>
  );
}

/** Ready-made setup for each client, reading the token from the environment. */
export function SetupLines() {
  const [client, setClient] = useState<McpClient>('claude-code');
  const setup = MCP_SETUPS.find((each) => each.client === client) ?? MCP_SETUPS[0];
  return (
    <div className="flex flex-col gap-2.5" data-setup={setup.client}>
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Your agent</legend>
        {MCP_SETUPS.map((each) => (
          <button
            key={each.client}
            type="button"
            aria-pressed={each.client === client}
            onClick={() => setClient(each.client)}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm',
              each.client === client ? 'border-primary bg-primary/10 font-semibold' : 'bg-background hover:bg-accent',
            )}
          >
            {each.name}
          </button>
        ))}
      </fieldset>
      <span className="text-sm text-muted-foreground">{setup.where}</span>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <Code>{setup.lines}</Code>
        </div>
        <CopyButton text={setup.lines} />
      </div>
    </div>
  );
}

/**
 * Settings, "Your own agent (MCP)": the user's tokens for their own agent (create one, shown once; revoke one), the
 * setup for each client, and the safety line. `ownAgent` is `undefined` while the API does not answer it yet.
 */
export function OwnAgentSection({
  ownAgent,
  now,
  step,
}: {
  ownAgent: ContributeOwnAgent | undefined;
  now?: Date;
  /** Its number on the own-agent path of Connect; none in Settings. */
  step?: number;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tokens = ownAgent?.tokens ?? [];
  const full = tokens.length >= MCP_TOKENS_MAX;

  const create = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await createMcpToken(name);
      if (!result.ok) {
        setMessage(contributeErrorMessage(result.error, result.message));
        return;
      }
      setCreated(result.data.token);
      setName('');
      router.refresh();
    });

  return (
    <Panel id="own-agent" className="gap-3.5">
      {step ? <Eyebrow>Step {step} · A token for your agent</Eyebrow> : null}
      <PanelTitle
        title="Your own agent (MCP)"
        text="Claude Code, Codex, Cursor or Gemini CLI on your machine finds issues here, works on one and hands the change back through our MCP server. You still review and approve every pull request here. Your agent and its model are your own: no Claude key is needed."
      />
      {ownAgent === undefined ? (
        <p className="text-sm text-muted-foreground">Not available yet. It is coming soon.</p>
      ) : (
        <>
          {created ? <NewToken token={created} onDone={() => setCreated(null)} /> : null}
          {tokens.length ? (
            <ul className="flex flex-col">
              {tokens.map((token) => (
                <TokenRow key={token.id} token={token} now={now} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No token yet.</p>
          )}
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Token name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MCP_TOKEN_NAME_MAX}
                placeholder="laptop"
                disabled={full}
                className="min-h-10 rounded-lg border bg-background px-3 text-sm"
              />
            </label>
            <button type="submit" disabled={pending || full || !name.trim()} className={primaryButton}>
              {pending ? 'Creating…' : 'Create token'}
            </button>
          </form>
          {full ? (
            <p className="text-sm text-muted-foreground">
              You have {MCP_TOKENS_MAX} tokens: revoke one to create another.
            </p>
          ) : null}
          {message ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {message}
            </p>
          ) : null}
          <h3 className="pt-1 text-sm font-semibold">Set up your agent</h3>
          <SetupLines />
          <p data-safety className="text-sm font-medium">
            {OWN_AGENT_SAFETY}
          </p>
        </>
      )}
    </Panel>
  );
}
