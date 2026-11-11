'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { createMcpToken, revokeMcpToken } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { HEADING, Panel, PanelTitle, SubTitle } from './primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContributeMcpToken, ContributeOwnAgent } from '@/lib/contribute/contribute.types';
import { MCP_DOCS_PATH } from '@/lib/contribute/contribute-path';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel, relativeLabel } from '@/lib/contribute/format';
import {
  exportLineOf,
  MCP_SETUPS,
  MCP_SIGN_IN_SETUPS,
  MCP_TOKEN_ENV,
  MCP_TOKEN_NAME_MAX,
  MCP_TOKENS_MAX,
  type McpClient,
  ownAgentTextOf,
  USE_A_TOKEN_INSTEAD,
} from '@/lib/contribute/mcp-setup';
import { isSignedInAgent, personalTokensOf } from '@/lib/contribute/oauth-consent';
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
        Put it in your shell profile, so your agent reads it from <code className="font-mono">{MCP_TOKEN_ENV}</code>.
        For Antigravity, put it in its MCP config instead, as its token setup shows.
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

/** What the row says of a connection: a token's last 4 and when it was made, or when an agent signed in. */
function connectionLine(token: ContributeMcpToken, now?: Date) {
  const used = token.lastUsedAt ? `used ${relativeLabel(token.lastUsedAt, now)}` : 'never used';
  if (isSignedInAgent(token))
    return (
      <>
        signed in {dayLabel(token.createdAt)} · {used}
      </>
    );
  return (
    <>
      <span className="font-mono">gr_…{token.last4}</span> · created {dayLabel(token.createdAt)} ·{' '}
      {token.lastUsedAt ? `last used ${relativeLabel(token.lastUsedAt, now)}` : 'never used'}
    </>
  );
}

function TokenRow({ token, now }: { token: ContributeMcpToken; now?: Date }) {
  const signedIn = isSignedInAgent(token);
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
            {signedIn
              ? 'Disconnected. It can no longer reach us.'
              : 'Revoked. An agent using it can no longer reach us.'}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{connectionLine(token, now)}</span>
        )}
      </div>
      {revoked ? null : (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive-outline" className="h-10">
              {signedIn ? 'Disconnect' : 'Revoke'}
              <span className="sr-only"> {token.name}</span>
            </Button>
          }
          open={confirming}
          onOpenChange={(open) => {
            if (open) setError(null);
            setConfirming(open);
          }}
          title={signedIn ? `Disconnect "${token.name}"?` : `Revoke "${token.name}"?`}
          description={
            signedIn
              ? 'It can no longer reach us, and the claims it is working on end if it is your only connection. Sign in from it again to reconnect.'
              : 'An agent using this token can no longer reach us, and the token cannot be brought back. Create a new one to connect it again.'
          }
          action={signedIn ? 'Disconnect' : 'Revoke token'}
          pendingAction={signedIn ? 'Disconnecting…' : 'Revoking…'}
          pending={pending}
          error={error}
          onConfirm={revoke}
        />
      )}
    </li>
  );
}

/** The connections, each with Disconnect or Revoke; `empty` when there is none. */
function TokenList({ tokens, now, empty }: { tokens: ContributeMcpToken[]; now?: Date; empty?: string }) {
  if (!tokens.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="flex flex-col">
      {tokens.map((token) => (
        <TokenRow key={token.id} token={token} now={now} />
      ))}
    </ul>
  );
}

/** One block of setup: what to do, the file it goes in when it names one, then the lines with their copy button. */
function SetupBlock({ where, lines, file }: { where: string; lines: string; file?: string }) {
  return (
    <>
      <span className="text-sm text-muted-foreground">{where}</span>
      {file ? <span className="font-mono text-xs text-muted-foreground">{file}</span> : null}
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <Code>{lines}</Code>
        </div>
        <CopyButton text={lines} />
      </div>
    </>
  );
}

/**
 * Ready-made setup for each client, reading the token from the environment. `signIn`: agents sign in with GitHub, so
 * a client's sign-in comes first and its token setup sits in a fold under it (Antigravity keeps the token).
 */
export function SetupLines({ signIn = false }: { signIn?: boolean }) {
  const [client, setClient] = useState<McpClient>('claude-code');
  const setup = MCP_SETUPS.find((each) => each.client === client) ?? MCP_SETUPS[0];
  const viaSignIn = signIn ? MCP_SIGN_IN_SETUPS.find((each) => each.client === setup.client) : undefined;
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
      {viaSignIn ? (
        <>
          <SetupBlock
            where={viaSignIn.where}
            lines={viaSignIn.lines}
            file={viaSignIn.file ? viaSignIn.label : undefined}
          />
          <details className="text-sm" data-token-fold>
            <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
              {USE_A_TOKEN_INSTEAD}
            </summary>
            <div className="mt-2 flex flex-col gap-2.5">
              <SetupBlock where={setup.where} lines={setup.lines} />
            </div>
          </details>
        </>
      ) : (
        <SetupBlock where={setup.where} lines={setup.lines} />
      )}
    </div>
  );
}

/**
 * Settings, "Your own agent (MCP)": the agents that signed in and the user's tokens (disconnect or revoke one), the
 * setup for each client, a new token (shown once), and the safety line. Once agents sign in with GitHub, the agents
 * that signed in and the setup lead, and the personal tokens follow; before, the tokens come first. `ownAgent` is `undefined` while the API does not
 * answer it yet.
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
  const personal = personalTokensOf(tokens);
  const signedIn = tokens.filter(isSignedInAgent);
  // The cap counts personal tokens alone: agents that signed in have their own.
  const full = personal.length >= MCP_TOKENS_MAX;

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

  /** Agents sign in with GitHub: the setup comes first, and the personal tokens after it. */
  const signIn = ownAgent?.signIn === true;
  const heading = (title: string) =>
    titled ? <SubTitle className="pt-1">{title}</SubTitle> : <h2 className={cn(HEADING.block, 'pt-1')}>{title}</h2>;
  const tokenForm = (
    <>
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
        <p className="text-sm text-muted-foreground">You have {MCP_TOKENS_MAX} tokens: revoke one to create another.</p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </>
  );

  return (
    <Panel id="own-agent" className="gap-3.5">
      {titled ? (
        <PanelTitle
          eyebrow={step ? `Step ${step} · ${signIn ? 'Connect your agent' : 'A token for your agent'}` : undefined}
          title="Your own agent (MCP)"
          text={ownAgentTextOf(signIn)}
        />
      ) : null}
      {ownAgent === undefined ? (
        <p className="text-sm text-muted-foreground">Not available yet. It is coming soon.</p>
      ) : (
        <>
          {signIn ? (
            <>
              <TokenList tokens={signedIn} now={now} empty="No agent connected yet." />
              {heading('Set up your agent')}
              <SetupLines signIn />
              {heading('Personal tokens')}
              <p className="text-sm text-muted-foreground">
                For Antigravity, scripts, or a client that can&apos;t sign in. Pick the client above for its token
                setup.
              </p>
              {created ? <NewToken token={created} onDone={() => setCreated(null)} /> : null}
              {personal.length ? <TokenList tokens={personal} now={now} /> : null}
              {tokenForm}
            </>
          ) : (
            <>
              {created ? <NewToken token={created} onDone={() => setCreated(null)} /> : null}
              <TokenList tokens={tokens} now={now} empty="No token yet." />
              {tokenForm}
              {heading('Set up your agent')}
              <SetupLines />
            </>
          )}
          <Link
            href={MCP_DOCS_PATH}
            prefetch={false}
            className="inline-flex items-center max-sm:min-h-11 self-start text-sm font-semibold text-link"
          >
            VS Code, other clients, the tools and the limits: the MCP docs →
          </Link>
          <p data-safety className="text-sm font-medium">
            {OWN_AGENT_SAFETY}
          </p>
        </>
      )}
    </Panel>
  );
}
