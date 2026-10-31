'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { createMcpToken, revokeMcpToken } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { Panel, PanelTitle, SubTitle } from './primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <Button type="button" variant="outline" onClick={copy} className="h-10">
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="dark overflow-x-auto rounded-lg bg-background px-3.5 py-3 font-mono text-sm leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

/** The token just created, shown this once, with the line that puts it in the shell's environment. */
function NewToken({ token, onDone }: { token: string; onDone: () => void }) {
  return (
    <div data-new-token className="flex flex-col gap-2.5 rounded-lg border border-warning/40 bg-warning-soft p-4">
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
        <Button type="button" variant="outline" onClick={onDone} className="h-10">
          I saved it
        </Button>
      </div>
    </div>
  );
}

function TokenRow({ token, now }: { token: ContributeMcpToken; now?: Date }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Revoked: the row says so, without its button, until the page reads the tokens again. */
  const [revoked, setRevoked] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (revoked) done.current?.focus();
  }, [revoked]);

  const revoke = () =>
    startTransition(async () => {
      setError(null);
      const result = await revokeMcpToken(token.id);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setConfirming(false);
      setRevoked(true);
      router.refresh();
    });

  return (
    <li
      data-mcp-token={token.id}
      className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{token.name}</span>
        {revoked ? (
          <span ref={done} role="status" tabIndex={-1} className="text-sm text-muted-foreground outline-none">
            Revoked. An agent using it can no longer reach us.
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            <span className="font-mono">gr_…{token.last4}</span> · created {dayLabel(token.createdAt)} ·{' '}
            {token.lastUsedAt ? `last used ${relativeLabel(token.lastUsedAt, now)}` : 'never used'}
          </span>
        )}
      </div>
      {revoked ? null : (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive-outline" className="h-10">
              Revoke
              <span className="sr-only"> {token.name}</span>
            </Button>
          }
          open={confirming}
          onOpenChange={(open) => {
            if (open) setError(null);
            setConfirming(open);
          }}
          title={`Revoke "${token.name}"?`}
          description="An agent using this token can no longer reach us, and the token cannot be brought back. Create a new one to connect it again."
          action="Revoke token"
          pendingAction="Revoking…"
          pending={pending}
          error={error}
          onConfirm={revoke}
        />
      )}
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
          <Button
            key={each.client}
            type="button"
            variant="outline"
            aria-pressed={each.client === client}
            onClick={() => setClient(each.client)}
            className={cn(
              'px-3 font-normal',
              each.client === client &&
                'border-primary bg-primary/10 font-semibold hover:bg-primary/10 dark:border-primary dark:bg-primary/10 dark:hover:bg-primary/10',
            )}
          >
            {each.name}
          </Button>
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

/** What the user's own agent does with us, under its title. */
export const OWN_AGENT_TEXT =
  'Claude Code, Codex, Cursor or Gemini CLI on your machine finds issues here, works on one and hands the change back through our MCP server. You still review and approve every pull request here. Your agent and its model are your own: no Claude key is needed.';

/**
 * Settings, "Your own agent (MCP)": the user's tokens for their own agent (create one, shown once; revoke one), the
 * setup for each client, and the safety line. `ownAgent` is `undefined` while the API does not answer it yet.
 */
export function OwnAgentSection({
  ownAgent,
  now,
  step,
  titled = true,
}: {
  ownAgent: ContributeOwnAgent | undefined;
  now?: Date;
  /** Its number on the own-agent path of Connect; none in Settings. */
  step?: number;
  /** False on its own Settings page, whose title says it. */
  titled?: boolean;
}) {
  const router = useRouter();
  const id = useId();
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
      {titled ? (
        <PanelTitle
          eyebrow={step ? `Step ${step} · A token for your agent` : undefined}
          title="Your own agent (MCP)"
          text={OWN_AGENT_TEXT}
        />
      ) : null}
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
            <label htmlFor={`${id}-name`} className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              <span className="font-medium">Token name</span>
              <Input
                id={`${id}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MCP_TOKEN_NAME_MAX}
                placeholder="laptop"
                disabled={full}
                className="h-10 rounded-lg text-sm"
              />
            </label>
            <Button type="submit" disabled={pending || full || !name.trim()} className="h-10 font-semibold">
              {pending ? 'Creating…' : 'Create token'}
            </Button>
          </form>
          {full ? (
            <p className="text-sm text-muted-foreground">
              You have {MCP_TOKENS_MAX} tokens: revoke one to create another.
            </p>
          ) : null}
          {message ? (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}
          <SubTitle className="pt-1">Set up your agent</SubTitle>
          <SetupLines />
          <p data-safety className="text-sm font-medium">
            {OWN_AGENT_SAFETY}
          </p>
        </>
      )}
    </Panel>
  );
}
