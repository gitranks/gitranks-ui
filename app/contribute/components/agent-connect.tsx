'use client';

import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';

import { createMcpToken, readAgentConnected, revokeMcpToken } from '../actions';
import { CodeBlock } from './code-block';
import { HEADING } from './primitives';
import { MakeNewToken, REPLACE_NOTE, TokenReady } from './token-ready';
import { useOnboardedPush } from './use-onboarded-push';
import { Button } from '@/components/ui/button';
import {
  AGENT_HELLO_PROMPT,
  AGENT_HINT_MS,
  AGENT_POLL_MS,
  agentWelcomeHref,
  replaceToken,
  unusedTokenOf,
} from '@/lib/contribute/agent-connect';
import type { ContributeMcpToken } from '@/lib/contribute/contribute.types';
import { CONNECT_KEY_PATH } from '@/lib/contribute/contribute-path';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import {
  MCP_CLIENT_NAMES,
  MCP_CLIENTS,
  MCP_TOKENS_MAX,
  type McpClient,
  type McpOs,
  mcpOsOf,
  mcpTokenCheckOf,
  mcpTokenNameOf,
  type NavigatorLike,
} from '@/lib/contribute/mcp-setup';
import { settingsPathOf } from '@/lib/contribute/settings-paths';
import { cn } from '@/lib/utils';

/** Where step 2 stands: no token yet, the token shown with its setup, or the setup done. */
export type AgentStage = 'none' | 'token' | 'added';

const card = 'flex flex-col gap-3.5 rounded-2xl bg-card p-4.5 sm:p-5.5';
const activeCard = 'border-2 border-primary';
const idleCard = 'border';
const cardTitle = HEADING.card;
const plainButton = 'min-h-11 px-3.5 font-semibold';

export type AgentConnectViewProps = {
  client: McpClient;
  onClient: (client: McpClient) => void;
  stage: AgentStage;
  /** The token made on this page, in its memory alone. */
  shown: string | null;
  /** The live token the user came back to, mid-setup: not shown again, only replaced. */
  pending?: ContributeMcpToken;
  os: McpOs;
  detectedOs: McpOs | null;
  onOs: (os: McpOs) => void;
  onCreate: () => void;
  onAdded: () => void;
  onReopen: () => void;
  onReplace: () => void;
  /** A token is being made or replaced. */
  working?: boolean;
  /** Every live token is taken: one must be revoked in Settings first. */
  full?: boolean;
  /** The API does not answer the tokens: nothing can be made here yet. */
  unavailable?: boolean;
  error?: string | null;
  /** Long enough without a call: say where the variable must be. */
  hint?: boolean;
  /** The token replaces one the agent may hold already: its setup takes the old one out first. */
  replaced?: boolean;
  /** The old token was revoked and the new one could not be made: say so, and offer to try again. */
  revokedOnly?: boolean;
  /** The agent has called: the token is off the page, which is on its way to the welcome. */
  connected?: boolean;
  /** Where focus goes after the button that had it is gone; `n` tells one move from the next. */
  focus?: AgentFocus | null;
};

/** The token's status line, step 2's heading, or step 3's. */
export type AgentFocus = { target: 'token' | 'connect' | 'hello'; n: number };

/**
 * B1, the own-agent path on one screen: which agent, then a token and the setup for it in place (B1b), then the first
 * call, which the page waits for.
 */
export function AgentConnectView({
  client,
  onClient,
  stage,
  shown,
  pending,
  os,
  detectedOs,
  onOs,
  onCreate,
  onAdded,
  onReopen,
  onReplace,
  working = false,
  full = false,
  unavailable = false,
  error,
  hint = false,
  replaced = false,
  revokedOnly = false,
  connected = false,
  focus = null,
}: AgentConnectViewProps) {
  const id = useId();
  const name = MCP_CLIENT_NAMES[client];
  const added = stage === 'added' || connected;
  const connectHeading = useRef<HTMLHeadingElement>(null);
  const helloHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focus?.target === 'connect') connectHeading.current?.focus();
    if (focus?.target === 'hello') helloHeading.current?.focus();
  }, [focus]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5" data-connect-path="agent">
      <div className="flex flex-col gap-2 pb-1">
        <span className="text-xs font-semibold text-primary">About a minute · no Claude key needed</span>
        <h1 className={HEADING.page}>Connect your own agent</h1>
        <p className="text-foreground/80">
          Your agent asks GitRanks for an issue, fixes it on your machine and hands the change back. You review it here
          before anything reaches GitHub.
        </p>
        <Link href={CONNECT_KEY_PATH} prefetch={false} className="text-sm font-semibold text-link">
          Use your Claude key instead →
        </Link>
      </div>

      <section aria-labelledby={`${id}-a1`} className={cn(card, idleCard)}>
        <h2 id={`${id}-a1`} className={cardTitle}>
          1 · Which agent do you use?
        </h2>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Your agent</legend>
          {MCP_CLIENTS.map((each) => (
            <button
              key={each}
              type="button"
              aria-pressed={each === client}
              onClick={() => onClient(each)}
              className={cn(
                'min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors',
                each === client
                  ? 'border-2 border-primary bg-brand-soft'
                  : 'border border-input bg-background hover:bg-accent',
              )}
            >
              {MCP_CLIENT_NAMES[each]}
            </button>
          ))}
        </fieldset>
      </section>

      <section
        aria-labelledby={`${id}-a2`}
        className={cn(card, added ? idleCard : activeCard)}
        data-agent-stage={stage}
      >
        <h2 id={`${id}-a2`} ref={connectHeading} tabIndex={-1} className={cn(cardTitle, 'outline-none')}>
          2 · Connect GitRanks to {name}
        </h2>
        {unavailable ? (
          <p className="text-sm text-muted-foreground">Not available yet. It is coming soon.</p>
        ) : stage === 'token' && shown && !connected ? (
          <TokenReady
            token={shown}
            client={client}
            os={os}
            detectedOs={detectedOs}
            onOs={onOs}
            onDone={onAdded}
            onReplace={onReplace}
            replacing={working}
            replaced={replaced}
            focusOnShow={focus?.target === 'token'}
          />
        ) : added ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-sm">
                <CheckIcon aria-hidden="true" className="size-4.5 flex-none text-positive" strokeWidth={2.6} />
                {shown || connected ? (
                  <span>
                    <span className="font-semibold">Token created</span> and GitRanks added to {name}
                  </span>
                ) : (
                  <span>
                    <span className="font-semibold">Your token is live</span>
                    {pending ? (
                      <>
                        {' '}
                        ({pending.name}, <span className="font-mono">gr_…{pending.last4}</span>)
                      </>
                    ) : null}
                    , and your agent hasn&apos;t called with it yet
                  </span>
                )}
              </span>
              {connected ? null : shown ? (
                <Button type="button" variant="outline" onClick={onReopen} className={plainButton}>
                  Show the setup again
                </Button>
              ) : (
                <MakeNewToken onReplace={onReplace} pending={working} />
              )}
            </div>
            {shown || connected ? null : (
              <span className="text-xs text-muted-foreground">We showed it only once. {REPLACE_NOTE}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="max-w-2xl text-sm text-foreground/80">
              Your agent signs in to GitRanks with this token, as you: it finds issues, claims one, hands back the patch
              and sees your contributions. It can&apos;t open a pull request or spend anything, and you can revoke it in
              Settings.
            </p>
            <Button
              type="button"
              size="lg"
              onClick={onCreate}
              disabled={working || full}
              className="min-h-12 flex-none px-5.5 text-base font-semibold"
            >
              {working ? 'Creating…' : 'Create a GitRanks token'}
            </Button>
            <span className="text-xs text-muted-foreground">
              {revokedOnly ? (
                <>We name it &ldquo;{mcpTokenNameOf(client, os)}&rdquo; and list it in Settings.</>
              ) : full ? (
                <>
                  You have {MCP_TOKENS_MAX} live tokens.{' '}
                  <Link href={settingsPathOf('own-agent')} prefetch={false} className="font-semibold text-link">
                    Revoke one in Settings
                  </Link>{' '}
                  to create another.
                </>
              ) : (
                <>
                  We name it &ldquo;{mcpTokenNameOf(client, os)}&rdquo; and list it in Settings. Creating a token never
                  revokes the others: up to {MCP_TOKENS_MAX} stay live.
                </>
              )}
            </span>
          </div>
        )}
        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1" data-agent-error>
            <p className="text-sm font-medium text-destructive">
              {revokedOnly ? `Your old token is revoked, and a new one wasn't made. ${error}` : error}
            </p>
            {revokedOnly ? (
              <Button type="button" variant="outline" onClick={onCreate} disabled={working} className={plainButton}>
                {working ? 'Creating…' : 'Try again'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby={`${id}-a3`}
        className={cn(card, added ? activeCard : cn(idleCard, 'opacity-55'))}
        data-agent-hello={added ? 'waiting' : 'next'}
      >
        <h2 id={`${id}-a3`} ref={helloHeading} tabIndex={-1} className={cn(cardTitle, 'outline-none')}>
          3 · Say hello from your agent
        </h2>
        {added ? (
          <div className="flex flex-col gap-3.5">
            <p className="text-sm text-foreground/80">Start {name} and ask it:</p>
            <CodeBlock label={`Prompt for ${name}`} copyLabel="Copy the prompt" wrap>
              {AGENT_HELLO_PROMPT}
            </CodeBlock>
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2.5 rounded-xl border border-dashed border-primary/40 bg-muted/40 px-4 py-3.5"
            >
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="relative size-3 flex-none">
                  <span
                    className={cn(
                      'absolute inset-0 rounded-full bg-primary',
                      !connected && 'motion-safe:animate-contribute-pulse',
                    )}
                  />
                  <span className="absolute inset-0 rounded-full bg-primary" />
                </span>
                {connected ? (
                  <span className="text-sm font-semibold">Your agent is connected. Taking you on…</span>
                ) : (
                  <span className="text-sm">
                    <span className="font-semibold">Waiting for your agent to connect…</span>{' '}
                    <span className="text-muted-foreground">This page moves on by itself the moment it calls.</span>
                  </span>
                )}
              </div>
              {hint && !connected ? (
                // In the status region, so it is announced when it appears.
                <span className="text-xs text-muted-foreground" data-agent-hint>
                  Nothing yet? The variable must be set where {name} runs. In that terminal,{' '}
                  <code className="font-mono">{mcpTokenCheckOf(os)}</code> should print your token. If it prints
                  nothing, open a new terminal, check again, and start {name} from there.{' '}
                  {client === 'claude-code'
                    ? 'If you made a new token since you added GitRanks, run the setup again: Claude Code keeps the token it read then.'
                    : `If you made a new token since, restart ${name}, so it reads the new one.`}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Comes next, once GitRanks is added to {name}.</p>
        )}
      </section>
    </div>
  );
}

/**
 * B1 with its state: the token lives in this component's memory alone, never in storage or the URL. While a token is
 * live and the page is shown, it asks every 3s whether the agent has called; once it has, the token is taken off the
 * page (which the router may keep, hidden) and the page goes on to B2 in its place, the layout read again for the tabs.
 * `tokens` is `undefined` while the API does not answer them.
 */
export function AgentConnect({
  onboarded,
  tokens,
}: {
  /** Onboarded already (a key, or another agent): the new token's first use is what the page waits for. */
  onboarded: boolean;
  tokens: ContributeMcpToken[] | undefined;
}) {
  const goTo = useOnboardedPush();
  // Mid-setup: the newest token the agent has not called with is the one the user came back to.
  const unused = onboarded ? undefined : unusedTokenOf(tokens);
  const [client, setClient] = useState<McpClient>('claude-code');
  const [os, setOs] = useState<McpOs>('mac');
  const [detectedOs, setDetectedOs] = useState<McpOs | null>(null);
  const [shown, setShown] = useState<{ token: string; id: string } | null>(null);
  // The token made here, by its id alone: watched still once the token itself is off the page.
  const [madeId, setMadeId] = useState<string | null>(null);
  // A token the user had (their agent may hold it) was replaced: the setup takes it out first.
  const [replaced, setReplaced] = useState(false);
  const [revokedOnly, setRevokedOnly] = useState(false);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<AgentStage>(unused ? 'added' : 'none');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [focus, setFocus] = useState<AgentFocus | null>(null);
  // Live tokens: those listed, and those made or revoked here since.
  const [live, setLive] = useState(tokens?.length ?? 0);
  const [working, startTransition] = useTransition();
  const pending = madeId || replaced ? undefined : unused;
  const watchId = madeId ?? pending?.id ?? null;
  const moveFocus = (target: AgentFocus['target']) => setFocus((last) => ({ target, n: (last?.n ?? 0) + 1 }));

  const clientRef = useRef(client);
  clientRef.current = client;
  const gone = useRef(false);
  const goOn = useCallback(() => {
    if (gone.current) return;
    gone.current = true;
    // The token off the page first: the router keeps a page it leaves mounted, hidden, for Back.
    flushSync(() => {
      setShown(null);
      setConnected(true);
    });
    goTo(agentWelcomeHref(clientRef.current), { replace: true });
  }, [goTo]);

  useEffect(() => {
    const detected = mcpOsOf(typeof navigator === 'undefined' ? null : (navigator as NavigatorLike));
    setDetectedOs(detected);
    setOs(detected);
  }, []);

  // Whether the agent has called, asked while the tab is shown, until it has.
  useEffect(() => {
    if (!watchId) return;
    // Shown again (Back to a page the router kept): it may go on again.
    gone.current = false;
    let stopped = false;
    let asking = false;
    const stop = () => {
      stopped = true;
      clearInterval(timer);
    };
    const ask = async () => {
      if (stopped || asking || document.visibilityState !== 'visible') return;
      asking = true;
      try {
        const result = await readAgentConnected({ tokenId: watchId, onboarded });
        if (!stopped && result.ok && result.data) {
          stop();
          goOn();
        }
      } catch {
        // Offline, or a deploy under way: the next ask tries again.
      } finally {
        asking = false;
      }
    };
    const timer = setInterval(ask, AGENT_POLL_MS);
    void ask();
    return stop;
  }, [watchId, onboarded, goOn]);

  // Long without a call once the setup is done: the hint.
  useEffect(() => {
    if (stage !== 'added') return;
    const timer = setTimeout(() => setHint(true), AGENT_HINT_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  const create = () =>
    startTransition(async () => {
      setError(null);
      const result = await createMcpToken(mcpTokenNameOf(client, os));
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setShown({ token: result.data.token, id: result.data.mcpToken.id });
      setMadeId(result.data.mcpToken.id);
      setLive((count) => count + 1);
      setRevokedOnly(false);
      setStage('token');
      moveFocus('token');
    });

  const replace = () => {
    const current = madeId ?? pending?.id;
    if (!current) return;
    startTransition(async () => {
      setError(null);
      const result = await replaceToken(current, mcpTokenNameOf(client, os), {
        revoke: revokeMcpToken,
        create: createMcpToken,
      });
      if (!result.ok) {
        setError(contributeErrorMessage(result.error.error, result.error.message));
        if (result.stage === 'create') {
          // The old token is gone and no new one was made: the user tries again.
          setShown(null);
          setMadeId(null);
          setReplaced(true);
          setRevokedOnly(true);
          setLive((count) => Math.max(0, count - 1));
          setStage('none');
          moveFocus('connect');
        }
        return;
      }
      setShown({ token: result.created.token, id: result.created.mcpToken.id });
      setMadeId(result.created.mcpToken.id);
      setReplaced(true);
      setStage('token');
      moveFocus('token');
    });
  };

  return (
    <AgentConnectView
      client={client}
      onClient={setClient}
      stage={stage}
      shown={shown?.token ?? null}
      pending={pending}
      os={os}
      detectedOs={detectedOs}
      onOs={setOs}
      onCreate={create}
      onAdded={() => {
        setStage('added');
        moveFocus('hello');
      }}
      onReopen={() => {
        setStage('token');
        moveFocus('token');
      }}
      onReplace={replace}
      working={working}
      full={!shown && !revokedOnly && live >= MCP_TOKENS_MAX}
      unavailable={tokens === undefined}
      error={error}
      hint={hint}
      replaced={replaced}
      revokedOnly={revokedOnly}
      connected={connected}
      focus={focus}
    />
  );
}
