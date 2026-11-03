import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CodeBlock } from './code-block';
import { MarkHandledButton } from './follow-up-buttons';
import { allKindsOf, MoveCard } from './move-card';
import { Pill } from './primitives';
import {
  ProofFixBrokenActions,
  ProofPoll,
  ProofReplyActions,
  ProofRetryActions,
  ProofReviewActions,
  ProofTakeBack,
  ProofUnreadableActions,
} from './proof-actions';
import { ProofPreview } from './proof-preview';
import { Button } from '@/components/ui/button';
import { agentLabelOf, githubUrlOf, timeLabel } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeProofPostStep,
  ContributeProofSession,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { relativeLabel } from '@/lib/contribute/format';
import { MCP_CLIENT_NAMES } from '@/lib/contribute/mcp-setup';
import { clipped } from '@/lib/contribute/needs-you';
import type { NextStep, UserMove } from '@/lib/contribute/next-step';
import {
  lastUsedTokenOf,
  PROOF_FILE_MB,
  PROOF_FILES_MAX,
  proofBranchOf,
  proofConnectPathOf,
  proofPromptOf,
  screenshotsOf,
  shortShaOf,
  sizeOf,
} from '@/lib/contribute/proof';
import { cn } from '@/lib/utils';

/**
 * A review bot asks for proof only the user's machine can capture (2026-11-03): their own agent captures it, they
 * check it here, GitRanks posts it. One card, drawn from where the proof stands: connect the agent (A), run the prompt
 * (B), the agent at work (C), check the proof (D), the agent couldn't capture it or found the fix broken (E), posting,
 * failed, posted (F), and the ask gone. Every text the bot or the agent wrote is untrusted: plain text, or the
 * sanitized preview.
 */

type ProofMove = Extract<UserMove, { kind: 'proof' }>;

/** "Claude Code, Codex CLI, Cursor or Gemini CLI": the clients the setup knows; any MCP client works. */
const CLIENTS = (() => {
  const names = Object.values(MCP_CLIENT_NAMES);
  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
})();

const POST_STEPS: Record<ContributeProofPostStep, string> = {
  FILES: 'pushing the screenshots to your fork',
  BODY: "adding the section to the pull request's description",
  COMMENT: 'commenting on the pull request',
};

function BotAsk({ move, now }: { move: ProofMove; now?: Date }) {
  const ask = move.proof.ask;
  const by = ask?.bot ?? move.bot?.by ?? null;
  const title = ask?.title ?? move.bot?.verdict ?? null;
  if (!title) return null;
  const at = ask?.at ?? move.bot?.at;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm" data-bot-verdict="">
      <span className="font-mono text-xs text-muted-foreground">
        {[by, 'blocks the merge', relativeLabel(at, now)].filter(Boolean).join(' · ')}
      </span>
      <span className="font-medium break-words">“{clipped(title, 200)}”</span>
      {ask?.detail ? (
        <span className="break-words text-muted-foreground">It asks for: {clipped(ask.detail, 600)}</span>
      ) : null}
    </div>
  );
}

const Why = () => (
  <div className="flex flex-col gap-1 text-sm" data-proof-why="">
    <h3 className="font-semibold">Why only you</h3>
    <p className="text-muted-foreground">
      Our hosted agent works in a sandbox: it has no model keys, accounts or devices of yours, so it can't run the
      project for real. The proof has to come from your machine. Your own agent can capture it for you, and nothing
      reaches GitHub until you've checked it here.
    </p>
  </div>
);

type StepState = 'done' | 'active' | 'next';

function Step({ n, title, state, children }: { n: number; title: string; state: StepState; children: ReactNode }) {
  return (
    <li
      data-proof-step={n}
      data-state={state}
      className={cn(
        'flex gap-3.5 rounded-xl bg-card p-4',
        state === 'done' && 'border',
        state === 'active' && 'border border-primary/40 ring-1 ring-primary',
        state === 'next' && 'border border-dashed opacity-55',
      )}
    >
      {state === 'done' ? (
        <span
          aria-hidden="true"
          className="flex size-7 flex-none items-center justify-center rounded-full bg-positive/10 text-positive-strong"
        >
          <CheckIcon className="size-4" strokeWidth={2.4} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-7 flex-none items-center justify-center rounded-full text-sm font-semibold',
            state === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {n}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="text-sm font-semibold">
          {n} · {title}
          {state === 'done' ? <span className="sr-only"> (done)</span> : null}
        </h3>
        {children}
      </div>
    </li>
  );
}

/** A live status line: what the card waits for, with a pulse while it waits. */
function Status({ text, sub, pulse = true }: { text: string; sub?: string; pulse?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3.5 rounded-xl border border-dashed border-primary/40 bg-muted/40 px-4 py-3.5"
    >
      <span aria-hidden="true" className="relative size-3 flex-none">
        {pulse ? (
          <span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-contribute-pulse" />
        ) : null}
        <span className="absolute inset-0 rounded-full bg-primary" />
      </span>
      <span className="text-sm">
        <span className="font-semibold">{text}</span>
        {sub ? <span className="text-muted-foreground"> {sub}</span> : null}
      </span>
    </div>
  );
}

const CheckStep = () => (
  <p className="text-sm text-muted-foreground">
    You see every line and screenshot first. Then we add it to the pull request's description and ask the bot to read it
    again.
  </p>
);

function Limits({ prNumber }: { prNumber: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      Up to {PROOF_FILES_MAX} screenshots, {PROOF_FILE_MB} MB each. They go to a branch in your fork,{' '}
      <span className="font-mono">{proofBranchOf(prNumber)}</span>, and the pull request links them; your PR branch
      stays as it is.
    </p>
  );
}

/** "Rather do it yourself?": the proof added on GitHub, and the block marked handled here. */
function ByHand({ move, first }: { move: ProofMove; first: ContributeAttemptDetail }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  if (!pr) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-sm text-muted-foreground">
      <p>
        Rather do it yourself?{' '}
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
            Add it on GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          'Add it on GitHub'
        )}
        , then tell us:
      </p>
      <MarkHandledButton
        prId={pr.prId}
        prNumber={pr.number}
        kinds={move.kinds}
        all={allKindsOf(first, move.kinds)}
        label="I've done it"
      />
    </div>
  );
}

const agentOf = (session: ContributeProofSession | null) => agentLabelOf(session?.agent) ?? 'Your agent';

/** A: no agent of the user's has ever called: connect one first, from the connect page that shows the prompt last. */
function NotConnected({ move, first, primary, now }: CardProps) {
  const pr = first.pullRequest;
  if (!pr) return null;
  return (
    <MoveCard
      tone="amber"
      name="proof"
      heading="Your move: prove the fix on your machine"
      pill={<Pill tone="amber">Only you can do this</Pill>}
    >
      <BotAsk move={move} now={now} />
      <Why />
      <ol className="flex flex-col gap-2.5" aria-label="How the proof gets made">
        <Step n={1} title="Connect your own agent" state="active">
          <p className="text-sm text-muted-foreground">
            {CLIENTS}, or any agent that speaks MCP. Once, about two minutes; you come back here after.
          </p>
          <div>
            <Button asChild size="lg" variant={primary ? 'default' : 'outline'} className="min-h-11 px-4 font-semibold">
              <Link href={proofConnectPathOf(first.attemptId)} prefetch={false}>
                Connect your agent →
              </Link>
            </Button>
          </div>
        </Step>
        <Step n={2} title="Run the proof prompt" state="next">
          <p className="text-sm text-muted-foreground">
            Copy one line into your agent. It reads the full brief from GitRanks, runs the project on your machine and
            sends the proof back.
          </p>
        </Step>
        <Step n={3} title="Check it here, then we post it" state="next">
          <CheckStep />
        </Step>
      </ol>
      <Limits prNumber={pr.number} />
      <ByHand move={move} first={first} />
    </MoveCard>
  );
}

/** B: the agent is connected: one line to give it, and the card waits for it to pick the proof up. */
function Connected({ move, first, view, now }: CardProps) {
  const pr = first.pullRequest;
  if (!pr) return null;
  const token = lastUsedTokenOf(view.ownAgent?.tokens);
  const note = move.proof.session?.state === 'WAITING' ? move.proof.session.sendBack?.note : null;
  return (
    <MoveCard
      tone="amber"
      name="proof"
      heading="Your move: prove the fix on your machine"
      pill={<Pill tone="amber">Only you can do this</Pill>}
    >
      <ProofPoll />
      <BotAsk move={move} now={now} />
      <Why />
      <ol className="flex flex-col gap-2.5" aria-label="How the proof gets made">
        <Step n={1} title="Your agent is connected" state="done">
          {token ? (
            <p className="text-sm text-muted-foreground">
              {token.name} · last used {relativeLabel(token.lastUsedAt, now)}
            </p>
          ) : null}
        </Step>
        <Step n={2} title="Run the proof prompt" state="active">
          <p className="text-sm text-foreground/80">
            Start your agent ({CLIENTS}, or another one on GitRanks' MCP) in any folder and ask it:
          </p>
          <CodeBlock label="Prompt for your agent" copyLabel="Copy the prompt" wrap>
            {proofPromptOf(first.nameWithOwner, pr.number)}
          </CodeBlock>
          {note ? (
            <p className="text-sm break-words" data-proof-note="">
              <span className="font-semibold">Your note goes with it: </span>
              <span className="text-muted-foreground">{clipped(note, 600)}</span>
            </p>
          ) : null}
          <Status text="Waiting for your agent…" sub="This card moves on by itself the moment it picks the proof up." />
        </Step>
        <Step n={3} title="Check it here, then we post it" state="next">
          <CheckStep />
        </Step>
      </ol>
      <Limits prNumber={pr.number} />
      <ByHand move={move} first={first} />
    </MoveCard>
  );
}

/** C: the agent holds the proof, sends its screenshots, or GitRanks checks them. */
function Working({ move, now }: CardProps) {
  const session = move.proof.session;
  if (!session) return null;
  const picked = relativeLabel(session.startedAt, now);
  const lease = session.leaseUntil ? timeLabel(session.leaseUntil).split(', ').at(-1) : null;
  const checking = session.state === 'CHECKING';
  // Only an agent holding it can be relieved of it: never while GitRanks checks the screenshots.
  const held = session.state === 'RUNNING' || session.state === 'UPLOADING';
  return (
    <MoveCard
      tone="plain"
      name="proof"
      heading="Your agent is capturing the proof"
      pill={<Pill tone="violet">Working</Pill>}
    >
      <ProofPoll />
      <BotAsk move={move} now={now} />
      <ol className="flex flex-col gap-2.5" aria-label="How the proof gets made">
        <Step n={1} title="Your agent is connected" state="done">
          <p className="text-sm text-muted-foreground">{agentOf(session)}</p>
        </Step>
        <Step n={2} title="Run the proof prompt" state="done">
          {checking ? (
            <Status text="GitRanks is checking the screenshots." sub="You see the proof here in a minute." />
          ) : (
            <Status
              text={session.state === 'UPLOADING' ? 'Your agent is sending its screenshots.' : 'Your agent is on it.'}
              sub={[
                picked ? `Picked up ${picked}` : null,
                lease ? `it holds the proof until ${lease} and can ask for more time` : null,
              ]
                .filter(Boolean)
                .join('; ')
                .concat('. It runs the project on your machine, so this can take a while.')}
            />
          )}
          {session.checkError ? (
            <p className="text-sm break-words text-destructive" data-proof-check-error="">
              The last screenshots were refused: {clipped(session.checkError, 200)}. Your agent was told.
            </p>
          ) : null}
        </Step>
        <Step n={3} title="Check it here, then we post it" state="next">
          <CheckStep />
        </Step>
      </ol>
      {held ? (
        <p className="flex flex-wrap items-center gap-x-1 border-t pt-3 text-sm text-muted-foreground">
          Agent stuck or closed? <ProofTakeBack id={session.id} /> and run the prompt again.
        </p>
      ) : null}
    </MoveCard>
  );
}

/** What posting does: the section, the screenshots on the fork's branch, the bot's command. */
function WhatWePost({
  move,
  session,
  prNumber,
}: {
  move: ProofMove;
  session: ContributeProofSession;
  prNumber: number;
}) {
  const files = session.result?.files ?? [];
  const reReview = move.proof.ask?.reReview;
  const heading = session.result?.section?.heading.replace(/^#+\s*/, '') ?? 'proof';
  return (
    <div className="flex flex-col gap-2" data-proof-what-posts="">
      <h3 className="text-sm font-semibold">What we post when you say so</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
        <li>
          The “{clipped(heading, 80)}” section, in the pull request's description: it replaces a section of that name,
          or goes in before our footer. The rest of the description stays.
        </li>
        {files.length ? (
          <li>
            {screenshotsOf(files.length)} on the branch <span className="font-mono">{proofBranchOf(prNumber)}</span> in
            your fork.
          </li>
        ) : null}
        <li>
          {reReview ? (
            <>
              A comment: <span className="font-mono">{clipped(reReview, 80)}</span>.
            </>
          ) : (
            'No comment: the bot names no command to read it again, so ask it on GitHub.'
          )}
        </li>
      </ul>
    </div>
  );
}

/** D: the proof is back: read the preview, tick that nothing private is left, post it. */
function Review({ move, first, now }: CardProps) {
  const session = move.proof.session;
  const result = session?.result;
  const pr = first.pullRequest;
  if (!session || !result?.section || !pr) return null;
  const captured = shortShaOf(result.headSha);
  // The pull request's head now, as the last read saw it: none known, no line.
  const head = shortShaOf(move.proof.prHeadSha);
  return (
    <MoveCard
      tone="amber"
      name="proof"
      heading="Your move: check the proof, then post it"
      pill={<Pill tone="amber">Check it</Pill>}
    >
      <p className="text-sm break-words">
        <span className="font-semibold">Your agent captured it</span>
        <span className="text-muted-foreground">
          {' '}
          · {[agentOf(session), relativeLabel(session.stateAt, now)].filter(Boolean).join(' · ')}: “
          {clipped(result.summary, 600)}”
        </span>
      </p>
      {captured && head && captured !== head ? (
        <p className="text-sm text-warning-soft-foreground" data-proof-moved-head="">
          Captured on <span className="font-mono">{captured}</span>; the pull request is now at{' '}
          <span className="font-mono">{head}</span>.
        </p>
      ) : null}
      <ProofPreview
        proofId={session.id}
        heading={result.section.heading}
        markdown={result.section.markdown}
        files={result.files}
      />
      {result.files.length ? (
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground" data-proof-files="">
          {result.files.map((file) => (
            <li key={file.slot} className="break-words">
              Screenshot {file.slot}: {clipped(file.caption || file.name, 120)} · {sizeOf(file.bytes)}
              {file.width && file.height ? ` · ${file.width} × ${file.height}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      <WhatWePost move={move} session={session} prNumber={pr.number} />
      <ProofReviewActions key={`${session.id}-${session.round}`} id={session.id} redactions={result.redactions} />
    </MoveCard>
  );
}

/** E: the agent couldn't capture the proof: why, and the reply it drafted. */
function Cannot({ move, first, now }: CardProps) {
  const session = move.proof.session;
  const result = session?.result;
  const pr = first.pullRequest;
  if (!session || !result || !pr) return null;
  return (
    <MoveCard
      tone="amber"
      name="proof-cannot"
      heading="Your move: your agent couldn't capture the proof"
      pill={<Pill tone="amber">Only you can do this</Pill>}
    >
      <BotAsk move={move} now={now} />
      <div className="flex flex-col gap-1.5 text-sm">
        <h3 className="font-semibold">What your agent found</h3>
        <p className="break-words text-muted-foreground">
          {[agentOf(session), relativeLabel(session.stateAt, now)].filter(Boolean).join(' · ')}: “
          {clipped(result.summary, 600)}”
        </p>
      </div>
      <ProofReplyActions
        key={`${session.id}-${session.round}`}
        id={session.id}
        reply={result.reply ?? ''}
        prNumber={pr.number}
      />
    </MoveCard>
  );
}

/** E, the fix itself: the agent saw the fix fail. Report only: the next run takes its note. */
function FixBroken({ move, first, step, now }: CardProps) {
  const session = move.proof.session;
  const result = session?.result;
  const pr = first.pullRequest;
  if (!session || !result || !pr) return null;
  return (
    <MoveCard
      tone="red"
      name="proof-fix-broken"
      heading="Your move: your agent found the fix doesn't work"
      pill={<Pill tone="red">Fix doesn't work</Pill>}
    >
      <BotAsk move={move} now={now} />
      <div className="flex flex-col gap-1.5 text-sm">
        <h3 className="font-semibold">What your agent saw</h3>
        <p className="break-words text-muted-foreground">
          {[agentOf(session), relativeLabel(session.stateAt, now)].filter(Boolean).join(' · ')}: “
          {clipped(result.summary, 600)}”
        </p>
        {result.note ? (
          <p className="text-sm break-words whitespace-pre-line" data-proof-note="">
            {result.note}
          </p>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {step.run.open
          ? `Nothing is posted. Run ${step.run.round} starts with your agent's note, so it can fix the code; then ask your agent for the proof again.`
          : 'Nothing is posted. A run can fix the code once none is under way.'}
      </p>
      <ProofFixBrokenActions
        id={session.id}
        prId={pr.prId}
        round={step.run.round}
        note={result.note ?? result.summary}
        runOpen={step.run.open}
      />
    </MoveCard>
  );
}

/** Back for the user with nothing this page can show: an outcome it doesn't know, or a proof without its section. */
function Unreadable({ move }: CardProps) {
  const session = move.proof.session;
  if (!session) return null;
  return (
    <MoveCard
      tone="amber"
      name="proof-unreadable"
      heading="Your move: the proof can't be shown"
      pill={<Pill tone="amber">Check it</Pill>}
    >
      <p className="text-sm text-muted-foreground">
        Your agent sent something back that this page can't show, so nothing of it can be posted. Send it back with a
        note and run the prompt again, or discard it.
      </p>
      <ProofUnreadableActions key={`${session.id}-${session.round}`} id={session.id} />
    </MoveCard>
  );
}

/** GitRanks posts it, step by step. */
function Posting({ move }: CardProps) {
  const session = move.proof.session;
  if (!session) return null;
  const step = session.post?.step;
  return (
    <MoveCard tone="plain" name="proof" heading="Posting the proof" pill={<Pill tone="violet">Posting</Pill>}>
      <ProofPoll />
      <Status text="GitRanks is posting what you checked." sub={step ? `Now ${POST_STEPS[step]}.` : undefined} />
    </MoveCard>
  );
}

/** Posting failed: what failed, then try again from that step. */
function Failed({ move }: CardProps) {
  const session = move.proof.session;
  if (!session) return null;
  const step = session.post?.step;
  return (
    <MoveCard
      tone="red"
      name="proof-failed"
      heading="Your move: posting the proof failed"
      pill={<Pill tone="red">Posting failed</Pill>}
    >
      <p className="text-sm break-words">
        {step ? `It stopped ${POST_STEPS[step]}` : 'It stopped'}
        {session.post?.error ? `: ${clipped(session.post.error, 300)}` : '.'}
      </p>
      <p className="text-sm text-muted-foreground">
        Trying again goes on from that step: what was already posted is not posted twice.
      </p>
      <ProofRetryActions id={session.id} />
    </MoveCard>
  );
}

/** F: posted; the bot reads it again, and the block leaves Needs you once it lets the merge through. */
function Posted({ move, first, now }: CardProps) {
  const session = move.proof.session;
  const pr = first.pullRequest;
  if (!session || !pr) return null;
  const bot = move.proof.ask?.bot ?? move.bot?.by ?? 'the bot';
  const url = githubUrlOf(pr.url);
  const post = session.post;
  const reply = session.result?.outcome === 'CANNOT_PROVE';
  const files = session.result?.files.length ?? 0;
  const commentUrl = githubUrlOf(post?.commentUrl);
  const items: ReactNode[] = reply
    ? [
        <>
          Your reply is on{' '}
          {commentUrl ? (
            <a className="font-semibold text-link" href={commentUrl} target="_blank" rel="noopener noreferrer">
              #{pr.number} ↗
            </a>
          ) : (
            `#${pr.number}`
          )}
          {session.stateAt ? ` · ${relativeLabel(session.stateAt, now)}` : ''}
        </>,
      ]
    : [
        <>
          The proof is in the{' '}
          {url ? (
            <a className="font-semibold text-link" href={url} target="_blank" rel="noopener noreferrer">
              pull request's description ↗
            </a>
          ) : (
            "pull request's description"
          )}
          {post?.bodyAt ? ` · ${relativeLabel(post.bodyAt, now)}` : ''}
        </>,
        ...(files
          ? [
              <>
                {screenshotsOf(files)} on <span className="font-mono">{proofBranchOf(pr.number)}</span> in your fork
              </>,
            ]
          : []),
        commentUrl ? (
          <>
            Asked {bot} to read it again in{' '}
            <a className="font-semibold text-link" href={commentUrl} target="_blank" rel="noopener noreferrer">
              a comment ↗
            </a>
          </>
        ) : (
          <>
            {bot} names no command to read it again: ask it on GitHub
            {url ? (
              <>
                {' '}
                <a className="font-semibold text-link" href={url} target="_blank" rel="noopener noreferrer">
                  on #{pr.number} ↗
                </a>
              </>
            ) : null}
          </>
        ),
      ];
  return (
    <MoveCard
      tone="plain"
      name="proof-posted"
      heading={reply ? 'Reply posted' : `Proof posted: ${bot} reads it again`}
      pill={<Pill tone="neutral">Waiting on the bot</Pill>}
    >
      <ul className="flex flex-col gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 flex-none text-positive-strong" strokeWidth={2.4} />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        This leaves Needs you when {bot} lets the merge through. If it asks for more, the ask shows here and your agent
        can try again.
      </p>
    </MoveCard>
  );
}

/** The bot no longer asks: the proof that waited ended, with nothing posted. */
function AskCleared({ move }: CardProps) {
  const bot = move.bot?.by ?? 'The bot';
  return (
    <MoveCard
      tone="plain"
      name="proof-ask-cleared"
      heading="The bot no longer asks for proof"
      pill={<Pill tone="neutral">Not needed</Pill>}
    >
      <p className="text-sm text-muted-foreground">
        {bot}'s newest verdict asks for no proof, so the proof that waited for it ended. Nothing was posted.
      </p>
    </MoveCard>
  );
}

type CardProps = {
  move: ProofMove;
  first: ContributeAttemptDetail;
  step: NextStep;
  view: ContributeView;
  primary: boolean;
  now?: Date;
};

/** The proof's card, as its stage draws it. */
export function ProofCard(props: CardProps) {
  switch (props.move.stage) {
    case 'not-connected':
      return <NotConnected {...props} />;
    case 'connected':
      return <Connected {...props} />;
    case 'working':
      return <Working {...props} />;
    case 'review':
      return <Review {...props} />;
    case 'cannot':
      return <Cannot {...props} />;
    case 'fix-broken':
      return <FixBroken {...props} />;
    case 'unreadable':
      return <Unreadable {...props} />;
    case 'posting':
      return <Posting {...props} />;
    case 'failed':
      return <Failed {...props} />;
    case 'posted':
      return <Posted {...props} />;
    case 'ask-cleared':
      return <AskCleared {...props} />;
  }
}
