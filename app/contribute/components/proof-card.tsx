import Link from 'next/link';
import type { ReactNode } from 'react';

import { CodeBlock } from './code-block';
import { MarkHandledButton } from './follow-up-buttons';
import { allKindsOf, GithubButton, MoveCard, Steps } from './move-card';
import type { CardProps } from './move-props';
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
import { StatusLine, StatusLinkView } from './status-line';
import { Button } from '@/components/ui/button';
import { agentLabelOf, githubUrlOf, timeLabel } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeProofPostStep,
  ContributeProofSession,
} from '@/lib/contribute/contribute.types';
import { relativeLabel } from '@/lib/contribute/format';
import { MCP_CLIENT_NAMES } from '@/lib/contribute/mcp-setup';
import { clipped } from '@/lib/contribute/needs-you';
import type { UserMove } from '@/lib/contribute/next-step';
import type { ProofStage } from '@/lib/contribute/proof';
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

/**
 * A review bot asks for proof only the user's machine can capture (2026-11-03): their own agent captures it, they
 * check it here, GitRanks posts it. A move card for each stage that waits for the user (connect the agent, run the
 * prompt, check the proof, the agent couldn't capture it or found the fix broken, the proof can't be shown, posting
 * failed), and a status line for those that wait for nobody (the agent at work, posting, posted, the ask gone). Every
 * text the bot or the agent wrote is untrusted: plain text, or the sanitized preview.
 */

type ProofMove = Extract<UserMove, { kind: 'proof' }>;

/** "Claude Code, Codex CLI, Cursor, Gemini CLI or Antigravity": the clients the setup knows; any MCP client works. */
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

function Limits({ prNumber }: { prNumber: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      Up to {PROOF_FILES_MAX} screenshots, {PROOF_FILE_MB} MB each. They go to a branch in your fork,{' '}
      <span className="font-mono">{proofBranchOf(prNumber)}</span>, and the pull request links them; your PR branch
      stays as it is.
    </p>
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

const agentOf = (session: ContributeProofSession | null) => agentLabelOf(session?.agent) ?? 'Your agent';

const agentWhen = (session: ContributeProofSession, now: Date) =>
  [agentOf(session), relativeLabel(session.stateAt, now)].filter(Boolean).join(' · ');

/** "Add it on GitHub yourself ↗" and "I've done it": the proof by hand, the block marked handled here. */
function ByHand({ move, first }: { move: ProofMove; first: ContributeAttemptDetail }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  if (!pr) return null;
  return (
    <>
      {url ? (
        <GithubButton href={url} primary={false}>
          Add it on GitHub yourself ↗
        </GithubButton>
      ) : null}
      <MarkHandledButton
        prId={pr.prId}
        prNumber={pr.number}
        kinds={move.kinds}
        all={allKindsOf(first, move.kinds)}
        label="I've done it"
        look="large"
      />
    </>
  );
}

const STEPS_TO_PROVE = [
  `Connect your own agent once (${CLIENTS}, or any agent that speaks MCP; about two minutes).`,
  'Give it the proof prompt: it reads the full brief from GitRanks, runs the project on your machine and sends the proof back.',
  'Check it here; GitRanks adds it to the pull request only when you say so.',
];

/** The proof's card while a stage waits for the user (held by the proof's session, shown on the next step's pane). */
export function ProofMoveCard({ move: model, first, view, blocked, now, rider }: CardProps) {
  if (!first || model.data.card !== 'proof') return null;
  const move = model.data;
  const pr = first.pullRequest;
  const session = move.proof.session;
  const result = session?.result;
  const bot = move.proof.ask?.bot ?? move.bot?.by ?? 'The review bot';
  const common = {
    id: model.kinds[0],
    name: model.kinds[0],
    tone: model.tone,
    kindLine: model.kindLine,
    title: model.title,
    rider,
  };
  if (!pr) return null;
  switch (move.stage) {
    case 'not-connected':
      return (
        <MoveCard
          {...common}
          why={
            <p>{`${bot} blocks the merge until the PR shows the change working. Your own agent captures it; you check it before anything is posted.`}</p>
          }
          body={<BotAsk move={move} now={now} />}
          primary={
            <Button asChild size="lg" className="min-h-11 px-4 font-semibold">
              <Link href={proofConnectPathOf(first.attemptId)} prefetch={false}>
                Connect your agent →
              </Link>
            </Button>
          }
          secondary={<ByHand move={move} first={first} />}
          whyBody={
            <>
              <Why />
              <Steps steps={STEPS_TO_PROVE} />
              <Limits prNumber={pr.number} />
            </>
          }
        />
      );
    case 'connected': {
      const token = lastUsedTokenOf(view.ownAgent?.tokens);
      const note = session?.state === 'WAITING' ? session.sendBack?.note : null;
      return (
        <MoveCard
          {...common}
          why={<p>Your agent is connected. Give it this one line; this card moves on when it picks the proof up.</p>}
          body={
            <>
              <ProofPoll />
              {token ? (
                <p className="text-xs text-muted-foreground">
                  {token.name} · last used {relativeLabel(token.lastUsedAt, now)}
                </p>
              ) : null}
              <CodeBlock label="Prompt for your agent" copyLabel="Copy the prompt" wrap>
                {proofPromptOf(first.nameWithOwner, pr.number)}
              </CodeBlock>
              {note ? (
                <p className="text-sm break-words" data-proof-note="">
                  <span className="font-semibold">Your note goes with it: </span>
                  <span className="text-muted-foreground">{clipped(note, 600)}</span>
                </p>
              ) : null}
              <Status
                text="Waiting for your agent…"
                sub="This card moves on by itself the moment it picks the proof up."
              />
            </>
          }
          secondary={<ByHand move={move} first={first} />}
          whyBody={
            <>
              <Steps steps={STEPS_TO_PROVE} />
              <Limits prNumber={pr.number} />
            </>
          }
        />
      );
    }
    case 'review': {
      if (!session || !result?.section) return null;
      const captured = shortShaOf(result.headSha);
      const head = shortShaOf(move.proof.prHeadSha);
      return (
        <MoveCard
          {...common}
          why={<p>{`Your agent captured what ${bot} asks for. Nothing is posted until you say so.`}</p>}
          body={
            <>
              <p className="text-sm break-words">
                <span className="text-muted-foreground">
                  {agentWhen(session, now)}: “{clipped(result.summary, 600)}”
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
              <ProofReviewActions
                key={`${session.id}-${session.round}`}
                id={session.id}
                redactions={result.redactions}
              />
            </>
          }
        />
      );
    }
    case 'cannot':
      if (!session || !result) return null;
      return (
        <MoveCard
          {...common}
          why={<p>{clipped(result.summary, 200)}</p>}
          body={
            <>
              <p className="text-xs text-muted-foreground">{agentWhen(session, now)}</p>
              <ProofReplyActions
                key={`${session.id}-${session.round}`}
                id={session.id}
                reply={result.reply ?? ''}
                prNumber={pr.number}
              />
            </>
          }
          whyBody={<BotAsk move={move} now={now} />}
        />
      );
    case 'fix-broken': {
      if (!session || !result) return null;
      const startable = move.mayStart && !blocked.has('proof_fix');
      return (
        <MoveCard
          {...common}
          why={<p>{clipped(result.summary, 200)}</p>}
          body={
            <>
              {result.note ? (
                <p className="text-sm break-words whitespace-pre-line" data-proof-note="">
                  {result.note}
                </p>
              ) : null}
              <ProofFixBrokenActions
                id={session.id}
                prId={pr.prId}
                round={move.round}
                note={result.note ?? result.summary}
                runOpen={startable}
              />
            </>
          }
          whyBody={
            <p>
              {startable
                ? `Nothing is posted. Run ${move.round} starts with your agent's note, so it can fix the code; then ask your agent for the proof again.`
                : 'Nothing is posted. A run can fix the code once one may start.'}
            </p>
          }
        />
      );
    }
    case 'unreadable':
      if (!session) return null;
      return (
        <MoveCard
          {...common}
          why={<p>Your agent sent back something this page can't show, so nothing of it can be posted.</p>}
          body={<ProofUnreadableActions key={`${session.id}-${session.round}`} id={session.id} />}
        />
      );
    case 'failed': {
      if (!session) return null;
      const step = session.post?.step;
      return (
        <MoveCard
          {...common}
          why={
            <p>
              {step ? `It stopped ${POST_STEPS[step]}` : 'It stopped'}
              {session.post?.error ? `: ${clipped(session.post.error, 300)}` : '.'}
            </p>
          }
          body={<ProofRetryActions id={session.id} />}
          whyBody={<p>Trying again goes on from that step: what was already posted is not posted twice.</p>}
        />
      );
    }
    default:
      return null;
  }
}

/** What a posted proof put where: the description, the screenshots on the fork, the bot's command (or a reply). */
function PostedList({
  first,
  reply,
  bot,
  now,
}: {
  first: ContributeAttemptDetail;
  reply: boolean;
  bot: string;
  now: Date;
}) {
  const session = first.proof?.session;
  const pr = first.pullRequest;
  if (!session || !pr) return null;
  const url = githubUrlOf(pr.url);
  const post = session.post;
  const files = session.result?.files.length ?? 0;
  const commentUrl = githubUrlOf(post?.commentUrl);
  const link = (href: string | null, label: string) =>
    href ? (
      <a className="font-semibold text-link" href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    ) : (
      label
    );
  const items: ReactNode[] = reply
    ? [
        <>
          Your reply is on {link(commentUrl, `#${pr.number} ↗`)}
          {session.stateAt ? ` · ${relativeLabel(session.stateAt, now)}` : ''}
        </>,
      ]
    : [
        <>
          The proof is in the {link(url, "pull request's description ↗")}
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
            Asked {bot} to read it again in {link(commentUrl, 'a comment ↗')}
          </>
        ) : (
          <>
            {bot} names no command to read it again: ask it on GitHub
            {url ? <> {link(url, `on #${pr.number} ↗`)}</> : null}
          </>
        ),
      ];
  return (
    <ul className="flex flex-col gap-1.5" data-proof-posted="">
      {items.map((item, index) => (
        <li key={index} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** The proof's line while it waits for nobody: its agent at work, posting, posted, or the ask gone. */
export type ProofLine = { title: string; node: ReactNode };

/**
 * The proof's status line on the next step's pane, for the stages that wait for nobody; `compact`, its one muted line
 * under the card the pane shows ("Proof: … · its link"). Null for the stages that are moves.
 */
export function ProofStatus({
  first,
  stage,
  now,
  compact = false,
  details,
}: {
  first: ContributeAttemptDetail;
  stage: ProofStage | null;
  now: Date;
  compact?: boolean;
  details?: ReactNode;
}) {
  const session = first.proof?.session;
  const pr = first.pullRequest;
  if (!session || !pr || !stage) return null;
  const url = githubUrlOf(pr.url);
  const held = session.state === 'RUNNING' || session.state === 'UPLOADING';
  const bot = first.proof?.ask?.bot ?? 'the bot';
  const reply = session.result?.outcome === 'CANNOT_PROVE';
  const commentUrl = githubUrlOf(session.post?.commentUrl);
  const line =
    stage === 'working'
      ? {
          name: 'proof-working',
          lead: { kind: 'dot' } as const,
          title: 'Your agent is capturing the proof',
          fact: [
            relativeLabel(session.startedAt, now) ? `picked up ${relativeLabel(session.startedAt, now)}` : null,
            session.leaseUntil ? `holds it until ${timeLabel(session.leaseUntil).split(', ').at(-1)}` : null,
          ]
            .filter(Boolean)
            .join('; '),
          link: held ? <ProofTakeBack id={session.id} /> : null,
          extra: (
            <>
              {session.state === 'CHECKING' ? <p>GitRanks is checking the screenshots.</p> : null}
              {session.checkError ? (
                <p data-proof-check-error="">
                  The last screenshots were refused: {clipped(session.checkError, 200)}. Your agent was told.
                </p>
              ) : null}
            </>
          ),
          poll: true,
        }
      : stage === 'posting'
        ? {
            name: 'proof-posting',
            lead: { kind: 'dot' } as const,
            title: 'Posting the proof',
            fact: session.post?.step ? `Now ${POST_STEPS[session.post.step]}.` : null,
            link: null,
            extra: null,
            poll: true,
          }
        : stage === 'posted'
          ? {
              name: 'proof-posted',
              lead: { kind: 'pill', label: 'Bot reads it', tone: 'neutral' } as const,
              title: reply ? 'Reply posted' : `Proof posted: ${bot} reads it again`,
              fact: null,
              link:
                (commentUrl ?? url) ? (
                  <StatusLinkView
                    link={{ href: commentUrl ?? url ?? '', label: 'See it on GitHub ↗', external: true }}
                  />
                ) : null,
              extra: (
                <>
                  <PostedList first={first} reply={reply} bot={bot} now={now} />
                  <p>
                    This leaves Needs you when {bot} lets the merge through. If it asks for more, the ask shows here and
                    your agent can try again.
                  </p>
                </>
              ),
              poll: false,
            }
          : stage === 'ask-cleared'
            ? {
                name: 'proof-ask-cleared',
                lead: { kind: 'pill', label: 'Not needed', tone: 'neutral' } as const,
                title: 'The bot no longer asks for proof',
                fact: 'Nothing was posted.',
                link: null,
                extra: null,
                poll: false,
              }
            : null;
  if (!line) return null;
  if (compact) {
    return (
      <p
        className="flex flex-wrap items-center gap-x-1.5 border-t pt-3 text-xs text-muted-foreground"
        data-proof-rider={line.name}
      >
        Proof: {line.title}
        {line.link ? <> · {line.link}</> : null}
        {line.poll ? <ProofPoll /> : null}
      </p>
    );
  }
  return (
    <StatusLine
      name={line.name}
      lead={line.lead}
      title={line.title}
      fact={line.fact}
      link={line.link}
      live={line.poll}
      poll={line.poll ? <ProofPoll /> : null}
      details={
        line.extra || details ? (
          <>
            {line.extra}
            {details}
          </>
        ) : null
      }
    />
  );
}
