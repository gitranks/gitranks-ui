'use client';

import { ArrowLeft, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';
import { flushSync } from 'react-dom';

import { MakeNewToken, REPLACE_NOTE, TokenReady } from './token-ready';
import { reportContributeConnect } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeBlock } from '@/components/workspace/code-block';
import { HEADING } from '@/components/workspace/primitives';
import { useOnboardedPush } from '@/components/workspace/use-onboarded-push';
import { cn } from '@/lib/utils';
import { createMcpToken, readAgentConnected, revokeMcpToken } from '@/lib/workspace/actions';
import { AGENT_HINT_MS, AGENT_POLL_MS, replaceToken, unusedTokenOf } from '@/lib/workspace/agent-connect';
import type { ContributeSource } from '@/lib/workspace/click-tracking';
import type { ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import {
  AGENT_FIRST_PROMPT,
  ANTIGRAVITY_RELOAD,
  MCP_CLIENT_NAMES,
  MCP_CLIENTS,
  MCP_TOKEN_NAME_MAX,
  MCP_TOKENS_MAX,
  type McpClient,
  type McpOs,
  mcpOsOf,
  mcpSignInSetupOf,
  mcpTokenCheckOf,
  mcpTokenNameOf,
  type NavigatorLike,
  tokenInConfigOf,
  USE_A_TOKEN_INSTEAD,
} from '@/lib/workspace/mcp-setup';
import { personalTokensOf } from '@/lib/workspace/oauth-consent';
import {
  GETTING_IN_PATHS,
  MCP_DOCS_PATH,
  pullRequestByAttemptPath,
  settingsPathOf,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';

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
  /** Every live token is taken: one must be revoked on the Agent tab first. */
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
  /** The agent has called: the token is off the page, which is on its way to the next step. */
  connected?: boolean;
  /** Where focus goes after the button that had it is gone; `n` tells one move from the next. */
  focus?: AgentFocus | null;
  /** Reached from a proof's card: step 3 is the proof's prompt, and the page goes back to the card once the agent calls. */
  proof?: AgentConnectProof | null;
  /**
   * The agent signs in with GitHub: step 2 is the client's sign-in setup (`mcpSignInSetupOf`), with the token in a fold
   * under it, while no token is made or waiting on this page.
   */
  signIn?: boolean;
  /**
   * The steps inside another page (the Start page, onboarding), under its own heading: the agent and its setup, then
   * the wait for its first call. No back link, no title, no Claude key link and no first prompt: the page around it
   * offers those, and goes on to its own prompt.
   */
  embedded?: boolean;
  /** "Contributing only? You can also use a Claude key →": left out for someone who uses Learn alone. */
  keyLink?: boolean;
  /** Once the agent says hello the page stays, with the next step: the account was in the workspace already. */
  stay?: boolean;
  /** The name the next token gets; the client and the OS until the user writes another. */
  tokenName?: string;
  onTokenName?: (name: string) => void;
};

/** The proof the page was reached for: its contribution, its prompt and its pull request's number. */
export type AgentConnectProof = { attemptId: string; prompt: string; prNumber: number };

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
  proof = null,
  signIn = false,
  embedded = false,
  keyLink = true,
  stay = false,
  tokenName,
  onTokenName = () => {},
}: AgentConnectViewProps) {
  const tokenNameValue = tokenName ?? mcpTokenNameOf(client, os);
  const id = useId();
  const name = MCP_CLIENT_NAMES[client];
  const added = stage === 'added' || connected;
  const signInSetup = signIn ? mcpSignInSetupOf(client, os) : null;
  const connectHeading = useRef<HTMLHeadingElement>(null);
  const helloHeading = useRef<HTMLHeadingElement>(null);
  // In Learn the steps have no headings of their own: focus goes to the blocks.
  const connectBlock = useRef<HTMLDivElement>(null);
  const helloBlock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus?.target === 'connect') (connectHeading.current ?? connectBlock.current)?.focus();
    if (focus?.target === 'hello') (helloHeading.current ?? helloBlock.current)?.focus();
  }, [focus]);

  const picker = (
    <>
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
      <Link
        href={MCP_DOCS_PATH}
        prefetch={false}
        className="inline-flex items-center max-sm:min-h-11 self-start text-sm font-semibold text-link"
      >
        VS Code or another agent? The MCP docs →
      </Link>
    </>
  );

  // The token's name, as the Agent tab lists it: the client and the OS until the user writes their own.
  const nameField = (
    <label htmlFor={`${id}-token-name`} className="flex w-full max-w-sm flex-col gap-1 text-sm" data-token-name="">
      <span className="font-medium">Token name</span>
      <Input
        id={`${id}-token-name`}
        value={tokenNameValue}
        onChange={(event) => onTokenName(event.target.value)}
        maxLength={MCP_TOKEN_NAME_MAX}
        disabled={working}
        className="h-10 rounded-lg text-sm"
      />
    </label>
  );

  const connectBody = unavailable ? (
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
  ) : signInSetup && added ? (
    <div className="flex flex-wrap items-center justify-between gap-3" data-agent-sign-in="added">
      <span className="flex items-center gap-2.5 text-sm">
        <CheckIcon aria-hidden="true" className="size-4.5 flex-none text-positive" strokeWidth={2.6} />
        <span>
          <span className="font-semibold">GitRanks added to {name}.</span> {signInSetup.added}
        </span>
      </span>
      {connected ? null : (
        <Button type="button" variant="outline" onClick={onReopen} className={plainButton}>
          Show the setup again
        </Button>
      )}
    </div>
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
  ) : signInSetup ? (
    <div className="flex flex-col gap-3" data-agent-sign-in="setup">
      <p className="max-w-2xl text-sm text-foreground/80">
        {name} signs in to GitRanks with your GitHub account, and you allow it in your browser. It can see the issues
        picked for you and take one, hand back changes for your review, and see the issues you took and your pull
        requests. It can&apos;t open a pull request, push or post on GitHub, or see your Claude key, settings or GitHub
        access. Disconnect it any time on the Agent tab.
      </p>
      <p className="text-sm text-muted-foreground">{signInSetup.where}</p>
      <CodeBlock label={signInSetup.label} file={signInSetup.file} copyLabel={`Copy the ${name} setup`}>
        {signInSetup.lines}
      </CodeBlock>
      <Button
        type="button"
        size="lg"
        onClick={onAdded}
        className="min-h-12 flex-none self-start px-5.5 text-base font-semibold"
      >
        I added it
      </Button>
      <details className="text-sm" data-token-fold>
        <summary className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground max-sm:min-h-11">
          {USE_A_TOKEN_INSTEAD}
        </summary>
        <div className="mt-2 flex flex-col items-start gap-3">
          {full ? null : nameField}
          <Button type="button" variant="outline" onClick={onCreate} disabled={working || full} className={plainButton}>
            {working ? 'Creating…' : 'Create a GitRanks token'}
          </Button>
          <span className="text-xs text-muted-foreground">
            {full ? (
              <>
                You have {MCP_TOKENS_MAX} live tokens.{' '}
                <Link href={settingsPathOf('own-agent')} prefetch={false} className="font-semibold text-link">
                  Revoke one on the Agent tab
                </Link>{' '}
                to create another.
              </>
            ) : (
              <>
                We show its setup here, and list it on the Agent tab by this name. For clients that can&apos;t sign in,
                and for scripts.
              </>
            )}
          </span>
        </div>
      </details>
    </div>
  ) : (
    <div className="flex flex-col items-start gap-3">
      <p className="max-w-2xl text-sm text-foreground/80">
        Your agent connects to GitRanks with this token, as you: it finds issues, takes one, hands back the patch and
        sees your contributions. It can&apos;t open a pull request or spend anything, and you can revoke it on the Agent
        tab.
      </p>
      {full ? null : nameField}
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
          <>We list it on the Agent tab by this name.</>
        ) : full ? (
          <>
            You have {MCP_TOKENS_MAX} live tokens.{' '}
            <Link href={settingsPathOf('own-agent')} prefetch={false} className="font-semibold text-link">
              Revoke one on the Agent tab
            </Link>{' '}
            to create another.
          </>
        ) : (
          <>
            We list it on the Agent tab by this name. Creating a token never revokes the others: up to {MCP_TOKENS_MAX}{' '}
            stay live.
          </>
        )}
      </span>
    </div>
  );

  const errorBlock = error ? (
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
  ) : null;

  // What starts the agent's first call: the page's prompt asks for one; embedded, starting the agent (and signing it
  // in) is the call, and the page's own prompt comes after.
  const waitingText = embedded ? (
    <>
      <span className="font-semibold">Waiting for {name} to call GitRanks…</span>{' '}
      <span className="text-muted-foreground">
        {signInSetup
          ? `Start ${name} and sign it in. ${signInSetup.check}`
          : `Start ${name}, or restart it if it is open: it calls GitRanks as it starts. This step closes by itself the moment it does.`}
      </span>
    </>
  ) : (
    <>
      <span className="font-semibold">Waiting for your agent to connect…</span>{' '}
      <span className="text-muted-foreground">This page moves on by itself the moment it calls.</span>
    </>
  );

  const waitStatus = (
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
          <span className="text-sm font-semibold">
            {proof
              ? `Your agent is connected. Taking you back to PR #${proof.prNumber}…`
              : embedded || stay
                ? 'Your agent is connected.'
                : 'Your agent is connected. Taking you on…'}
          </span>
        ) : (
          <span className="text-sm">{waitingText}</span>
        )}
      </div>
      {/* The embedded sign-in says how to check it already. */}
      {hint && !connected && !(embedded && signInSetup) ? (
        // In the status region, so it is announced when it appears.
        <span className="text-xs text-muted-foreground" data-agent-hint>
          {signInSetup ? (
            `Nothing yet? ${signInSetup.check}`
          ) : tokenInConfigOf(client) ? (
            `Nothing yet? Check that the gitranks entry in ${name}'s MCP config holds your latest token, then ${ANTIGRAVITY_RELOAD} and ask again.`
          ) : (
            <>
              Nothing yet? The variable must be set where {name} runs. In that terminal,{' '}
              <code className="font-mono">{mcpTokenCheckOf(os)}</code> should print your token. If it prints nothing,
              open a new terminal, check again, and start {name} from there.{' '}
              {client === 'claude-code'
                ? 'If you made a new token since you added GitRanks, run the setup again: Claude Code keeps the token it read then.'
                : `If you made a new token since, restart ${name}, so it reads the new one.`}
            </>
          )}
        </span>
      ) : null}
      {connected && stay && !proof ? (
        <p className="text-sm" data-agent-next="">
          Next, pick an issue on{' '}
          <Link href={WORKSPACE_PATHS.contribute} prefetch={false} className="font-semibold text-link hover:underline">
            Contribute
          </Link>{' '}
          or{' '}
          <Link href={WORKSPACE_PATHS.learn} prefetch={false} className="font-semibold text-link hover:underline">
            Learn
          </Link>{' '}
          and press Start.
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    // Inside another page, under its "Connect your agent": the agent, its setup, then the wait for its call.
    return (
      <div className="flex flex-col gap-3.5" data-connect-path="agent" data-connect-mode="embedded">
        {picker}
        <div ref={connectBlock} tabIndex={-1} className="flex flex-col gap-3.5 outline-none" data-agent-stage={stage}>
          {connectBody}
          {errorBlock}
        </div>
        {added ? (
          <div ref={helloBlock} tabIndex={-1} className="outline-none" data-agent-hello="waiting">
            {waitStatus}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-5" data-connect-path="agent">
      <div className="flex flex-col gap-2 pb-1">
        <Link
          href={WORKSPACE_PATHS.agent}
          prefetch={false}
          className="inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-link max-sm:min-h-11"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Agent
        </Link>
        <span className="text-xs font-semibold text-primary">About a minute · once per computer</span>
        <h1 className={HEADING.page}>Connect your own agent</h1>
        <p className="text-foreground/80">
          Your agent fixes issues on your computer, with the plan you already pay for, and hands each change back.
          Nothing reaches GitHub before you approve it. One connection serves Contribute and Learn.
        </p>
        {keyLink ? (
          <p className="text-sm text-muted-foreground" data-key-link="">
            Contributing only?{' '}
            <Link
              href={WORKSPACE_PATHS.agentKey}
              prefetch={false}
              className="underline underline-offset-4 hover:text-foreground"
            >
              You can also use a Claude key →
            </Link>
          </p>
        ) : null}
      </div>

      <section aria-labelledby={`${id}-a1`} className={cn(card, idleCard)}>
        <h2 id={`${id}-a1`} className={cardTitle}>
          1 · Which agent do you use?
        </h2>
        {picker}
      </section>

      <section
        aria-labelledby={`${id}-a2`}
        className={cn(card, added ? idleCard : activeCard)}
        data-agent-stage={stage}
      >
        <h2 id={`${id}-a2`} ref={connectHeading} tabIndex={-1} className={cn(cardTitle, 'outline-none')}>
          2 · Connect GitRanks to {name}
        </h2>
        {connectBody}
        {errorBlock}
      </section>

      <section
        aria-labelledby={`${id}-a3`}
        className={cn(card, added ? activeCard : cn(idleCard, 'opacity-55'))}
        data-agent-hello={added ? 'waiting' : 'next'}
      >
        <h2 id={`${id}-a3`} ref={helloHeading} tabIndex={-1} className={cn(cardTitle, 'outline-none')}>
          {proof ? '3 · Run the proof prompt' : '3 · Say hello from your agent'}
        </h2>
        {added ? (
          <div className="flex flex-col gap-3.5" data-agent-prompt={proof ? 'proof' : 'hello'}>
            <p className="text-sm text-foreground/80">
              {proof
                ? `Start ${name} in any folder and ask it. It connects, reads the brief and starts on the proof:`
                : `Start ${name} and ask it:`}
            </p>
            <CodeBlock label={proof ? 'Prompt for your agent' : `Prompt for ${name}`} copyLabel="Copy the prompt" wrap>
              {proof ? proof.prompt : AGENT_FIRST_PROMPT}
            </CodeBlock>
            {waitStatus}
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
 * For an account already in the workspace the page stays instead, and says the next step. `embedded`, it tells
 * `onConnected`, and the page around it goes on in place. `tokens` is `undefined` while the API does not answer them.
 */
export function AgentConnect({
  onboarded,
  tokens,
  proof = null,
  signIn = false,
  openedAt = null,
  embedded = false,
  keyLink = true,
  onConnected,
  onAdded,
  connectSource,
}: {
  /** Onboarded already (a key, or another agent): the new token's first use is what the page waits for. */
  onboarded: boolean;
  tokens: ContributeMcpToken[] | undefined;
  /** Reached from a proof's card: once the agent calls, the page goes back to the card. */
  proof?: AgentConnectProof | null;
  /** Agents sign in with GitHub: the setup leads with the sign-in, a token is the fallback. */
  signIn?: boolean;
  /** When the server rendered the page: a sign-in used after it is the agent calling, for a user onboarded before. */
  openedAt?: string | null;
  /** The steps inside another page, which `onConnected` hears from instead of a move to Contribute. */
  embedded?: boolean;
  /** The page's "You can also use a Claude key" line. */
  keyLink?: boolean;
  /** Embedded: the agent has called, with the client picked here (our guess: the call does not say which client made it). */
  onConnected?: (client: McpClient) => void;
  /** "I added it" pressed: the person says GitRanks is in their agent now, before the agent's first call. */
  onAdded?: () => void;
  /** Where the connect is counted from, in place of the click that led here. */
  connectSource?: ContributeSource;
}) {
  const goTo = useOnboardedPush();
  // Mid-setup: the newest token the agent has not called with is the one the user came back to.
  const unused = onboarded ? undefined : unusedTokenOf(tokens);
  const [client, setClient] = useState<McpClient>('claude-code');
  const [os, setOs] = useState<McpOs>('mac');
  const [detectedOs, setDetectedOs] = useState<McpOs | null>(null);
  // A name the user wrote for the next token; the client and the OS until they do.
  const [customName, setCustomName] = useState<string | null>(null);
  const tokenName = customName?.trim() ? customName : mcpTokenNameOf(client, os);
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
  const [live, setLive] = useState(personalTokensOf(tokens).length);
  const [working, startTransition] = useTransition();
  const pending = madeId || replaced ? undefined : unused;
  const watchId = madeId ?? pending?.id ?? null;
  // The sign-in path, while no token is made or waiting here.
  const viaSignIn = signIn && !madeId && !pending && !revokedOnly && !replaced;
  // Its setup done: the page waits for the agent's first call, with no token to watch.
  const watchSignIn = viaSignIn && stage === 'added';
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
    if (!proof) reportContributeConnect('agent', connectSource);
    if (embedded) {
      onConnected?.(clientRef.current);
      return;
    }
    // In the workspace already: the page stays, with the next step.
    if (!proof && onboarded) return;
    // A first connect goes on to the first issue, the last step of Contribute's flow.
    goTo(
      proof
        ? pullRequestByAttemptPath(proof.attemptId, { query: { session: 'next' } })
        : GETTING_IN_PATHS.contributeIssue,
      { replace: true },
    );
  }, [goTo, proof, embedded, onboarded, onConnected, connectSource]);

  useEffect(() => {
    const detected = mcpOsOf(typeof navigator === 'undefined' ? null : (navigator as NavigatorLike));
    setDetectedOs(detected);
    setOs(detected);
  }, []);

  // Whether the agent has called, asked while the tab is shown, until it has.
  useEffect(() => {
    if (!watchId && !watchSignIn) return;
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
        const result = await readAgentConnected({ tokenId: watchId, onboarded, since: watchId ? null : openedAt });
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
  }, [watchId, watchSignIn, openedAt, onboarded, goOn]);

  // Long without a call once the setup is done: the hint.
  useEffect(() => {
    if (stage !== 'added') return;
    const timer = setTimeout(() => setHint(true), AGENT_HINT_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  const create = () =>
    startTransition(async () => {
      setError(null);
      const result = await createMcpToken(tokenName.trim());
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
      const result = await replaceToken(current, tokenName.trim(), {
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
        onAdded?.();
      }}
      onReopen={() => {
        if (viaSignIn && !shown) {
          setStage('none');
          moveFocus('connect');
          return;
        }
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
      proof={proof}
      signIn={viaSignIn}
      embedded={embedded}
      keyLink={keyLink}
      stay={onboarded && !proof}
      tokenName={customName ?? tokenName}
      onTokenName={setCustomName}
    />
  );
}
