import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LiveDot } from './agent-runs';
import { CodeBlock } from './code-block';
import { MarkHandledButton, SignOffButton, StartFollowUpButton } from './follow-up-buttons';
import { PrConventionsCard } from './pr-conventions-card';
import { HEADING, Pill } from './primitives';
import { ReviewFeedbackCard } from './review-feedback';
import { Button } from '@/components/ui/button';
import { editableBodyOf, githubUrlOf, isOwnAgent, timeLabel } from '@/lib/contribute/attempt-format';
import type { ContributeAttemptDetail, ContributePrSignal, ContributeView } from '@/lib/contribute/contribute.types';
import { autopilotLineOf, FILLED_NOTE_HINT, signalText } from '@/lib/contribute/follow-up-format';
import { relativeLabel, usd } from '@/lib/contribute/format';
import { clipped } from '@/lib/contribute/needs-you';
import { type NextStep, nextStepOf, type RunFinding, type UserMove, yourMoveOf } from '@/lib/contribute/next-step';
import { attemptPath, nextSessionPath } from '@/lib/contribute/sessions';
import { cn } from '@/lib/utils';

/** The run's card is anchored: the user's cards link to it ("Start run 3 with a note →"). */
const RUN_ANCHOR = 'next-run';

/** A card of the next step: amber for a move only the user can make, red for a check that fails, violet for a run. */
const MOVE_CARD = {
  amber: 'border-warning/40 ring-warning/10',
  red: 'border-negative/30 ring-negative/10',
  violet: 'border-primary/30 ring-primary/10',
} as const;

function MoveCard({
  tone,
  heading,
  pill,
  name,
  id,
  children,
}: {
  tone: keyof typeof MOVE_CARD;
  heading: string;
  pill: ReactNode;
  /** The card's kind, for the specs and the boards. */
  name: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-next-card={name}
      className={cn('flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-5 ring-2', MOVE_CARD[tone])}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={HEADING.card}>{heading}</h2>
        {pill}
      </div>
      {children}
    </section>
  );
}

/** A link to GitHub as a button: the card's main one, or beside it. */
function GithubButton({ href, primary, children }: { href: string; primary: boolean; children: ReactNode }) {
  return (
    <Button asChild size="lg" variant={primary ? 'default' : 'outline'} className="min-h-11 px-4 font-semibold">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}

const Steps = ({ steps }: { steps: string[] }) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-sm font-semibold">What to do</h3>
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm break-words">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  </div>
);

/** "Run 1 · Oct 28, 10:52 UTC · $0.31": when the run ended, and what it cost. */
const findingMetaOf = (run: RunFinding) =>
  [timeLabel(run.at), run.costUsd ? usd(run.costUsd) : null].filter(Boolean).join(' · ');

/** "Think the code needs a change after all? Start run 3 with a note →", to the run's card below. */
function RunAnyway({ step, text }: { step: NextStep; text: string }) {
  if (!step.run.open) return null;
  return (
    <p className="border-t pt-3 text-sm text-muted-foreground">
      {text}{' '}
      <a href={`#${RUN_ANCHOR}`} className="font-semibold text-link">
        Start run {step.run.round} with a note →
      </a>
    </p>
  );
}

type CardProps = { first: ContributeAttemptDetail; step: NextStep; primary: boolean; now?: Date };

/** A review bot's block, or what a run found is left for the user, or both: the steps, GitHub, "I've done it". */
function FoundCard({ move, first, step, primary, now }: CardProps & { move: Extract<UserMove, { kind: 'found' }> }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  const by = move.bot?.by ?? 'the review bot';
  const steps = [
    move.run?.detail ? clipped(move.run.detail, 300) : `Read what ${by} asks in its comment on #${pr?.number}.`,
    'Do it on the pull request, on GitHub.',
    move.bot
      ? `${by} reads it again: this leaves Needs you once it lets the merge through, or when you say you've done it.`
      : "Say you've done it here: it leaves Needs you.",
  ];
  return (
    <MoveCard
      tone="amber"
      name="found"
      heading={
        move.run
          ? `Your move: what ${move.run.round ? `run ${move.run.round}` : 'the last run'} left for you`
          : `Your move: do what ${by} asks`
      }
      pill={<Pill tone="amber">Only you can do this</Pill>}
    >
      {move.bot ? (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm" data-bot-verdict="">
          <span className="font-mono text-xs text-muted-foreground">
            {[move.bot.by, 'blocks the merge', relativeLabel(move.bot.at, now)].filter(Boolean).join(' · ')}
          </span>
          <span className="font-medium break-words">“{clipped(move.bot.verdict, 300)}”</span>
        </div>
      ) : null}
      {move.run ? (
        <p className="text-sm break-words" data-run-finding={move.run.round ?? ''}>
          <span className="font-semibold">
            {move.run.round ? `Run ${move.run.round}` : 'The last run'} changed nothing
          </span>
          <span className="text-muted-foreground">
            {' '}
            · {findingMetaOf(move.run)}: the agent found the rest is yours to do.
          </span>
        </p>
      ) : null}
      <Steps steps={steps} />
      <div className="flex flex-wrap items-start gap-3">
        {url && pr ? (
          <GithubButton href={url} primary={primary}>
            Open PR #{pr.number} on GitHub ↗
          </GithubButton>
        ) : null}
        {pr ? (
          <MarkHandledButton
            prId={pr.prId}
            prNumber={pr.number}
            kinds={move.kinds}
            all={allKindsOf(first, move.kinds)}
            label="I've done it"
            look="large"
          />
        ) : null}
      </div>
      <RunAnyway step={step} text="Think the code needs a change after all?" />
    </MoveCard>
  );
}

/** A run that stopped before it was done, or whose commits failed to push: the next run, or the user's own hands. */
function StoppedCard({ move, first, step, primary }: CardProps & { move: Extract<UserMove, { kind: 'stopped' }> }) {
  const pr = first.pullRequest;
  const name = move.run.round ? `Run ${move.run.round}` : 'The last run';
  const unpushed = move.run.outcome === 'push_failed';
  return (
    <MoveCard
      tone="red"
      name={unpushed ? 'push-failed' : 'stopped'}
      heading={`Your move: try run ${step.run.round}, or handle it yourself`}
      pill={
        <Pill tone="red">
          {unpushed
            ? move.run.round
              ? `Run ${move.run.round} not pushed`
              : 'Push failed'
            : move.run.round
              ? `Run ${move.run.round} stopped`
              : 'Run stopped'}
        </Pill>
      }
    >
      <p className="text-sm break-words" data-run-finding={move.run.round ?? ''}>
        <span className="font-semibold">{unpushed ? `${name}'s commits could not be pushed` : `${name} stopped`}</span>
        <span className="text-muted-foreground">
          {' '}
          · {findingMetaOf(move.run)}
          {move.run.detail ? `: ${clipped(move.run.detail, 300)}` : '.'}
        </span>
      </p>
      <p className="text-sm text-muted-foreground">
        {unpushed
          ? 'You approved them, but they never reached the pull request. A new run starts from the pull request as it is now and makes the change again; tell it what to do differently in its note.'
          : 'Nothing was pushed. A new run starts from the pull request as it is; tell it what to do differently in its note.'}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        {step.run.open ? (
          <Button asChild size="lg" variant={primary ? 'default' : 'outline'} className="min-h-11 px-4 font-semibold">
            <a href={`#${RUN_ANCHOR}`}>Try run {step.run.round}</a>
          </Button>
        ) : null}
        {pr ? (
          <MarkHandledButton
            prId={pr.prId}
            prNumber={pr.number}
            kinds={move.kinds}
            all={allKindsOf(first, move.kinds)}
            label="I'll handle it"
            look="large"
          />
        ) : null}
      </div>
    </MoveCard>
  );
}

/** An agreement to sign: the comment to post word for word, or the page to sign it on. */
function AgreementCard({ move, first, primary }: CardProps & { move: Extract<UserMove, { kind: 'agreement' }> }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  const signUrl = move.signUrl ?? url;
  const handled = pr ? (
    <MarkHandledButton
      prId={pr.prId}
      prNumber={pr.number}
      kinds={move.kinds}
      all={allKindsOf(first, move.kinds)}
      label={move.signComment ? 'I posted it' : 'I signed it'}
      look="large"
    />
  ) : null;
  return (
    <MoveCard
      tone="amber"
      name="agreement"
      heading={`Your move: sign the ${move.agreement}`}
      pill={<Pill tone="amber">{move.signComment ? 'Agreement to sign' : `${move.agreement} to sign`}</Pill>}
    >
      {move.signComment ? (
        <>
          <p className="text-sm">
            The repo asks every contributor to sign its {move.agreement} by posting this comment on the pull request,
            word for word. Its bot records your signature from it. Nobody can sign it for you.
          </p>
          <CodeBlock label="Your comment on the pull request" copyLabel="Copy the comment" wrap>
            {move.signComment}
          </CodeBlock>
          {move.signUrl ? (
            <a href={move.signUrl} target="_blank" rel="noreferrer" className="self-start text-sm text-link">
              Read the {move.agreement} first<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <div className="flex flex-wrap items-start gap-3">
            {url && pr ? (
              <GithubButton href={url} primary={primary}>
                Open PR #{pr.number} on GitHub ↗
              </GithubButton>
            ) : null}
            {handled}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            The repo asks every contributor to sign its {move.agreement}
            {move.check ? ` (its check: ${move.check})` : ''}. Sign it on its page; this clears once the check passes.
            Nobody can sign it for you.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            {signUrl ? (
              <GithubButton href={signUrl} primary={primary}>
                Sign the {move.agreement} ↗
              </GithubButton>
            ) : null}
            {handled}
          </div>
        </>
      )}
    </MoveCard>
  );
}

/** The title breaks the repo's rules and no one-click fix was read for it: retitle it on GitHub. */
function TitleCard({ move, first, primary }: CardProps & { move: Extract<UserMove, { kind: 'title' }> }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  return (
    <MoveCard
      tone="amber"
      name="title"
      heading="Your move: retitle the pull request"
      pill={<Pill tone="amber">Title rule</Pill>}
    >
      <p className="text-sm break-words">
        The title breaks the repo&apos;s rules{move.title ? `: "${clipped(move.title, 200)}"` : ''}. Retitle it on
        GitHub; this clears once it holds another title.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        {url && pr ? (
          <GithubButton href={url} primary={primary}>
            Open PR #{pr.number} on GitHub ↗
          </GithubButton>
        ) : null}
        {pr ? (
          <MarkHandledButton
            prId={pr.prId}
            prNumber={pr.number}
            kinds={move.kinds}
            all={allKindsOf(first, move.kinds)}
            label="I've done it"
            look="large"
          />
        ) : null}
      </div>
    </MoveCard>
  );
}

/** The DCO's text, for what signing off certifies. */
const DCO_URL = 'https://developercertificate.org/';

/**
 * A DCO sign-off missing on our commits: GitRanks rewrites them with the user's sign-off (the same code, a
 * force-push), or, on a pull request they opened by hand, how to do it themselves. Its fix's state under it.
 */
function DcoCard({
  first,
  dco,
  primary,
}: {
  first: ContributeAttemptDetail;
  dco: NonNullable<NextStep['dco']>;
  primary: boolean;
}) {
  const pr = first.pullRequest;
  const repo = first.nameWithOwner || 'This repo';
  const fix = dco.fix;
  const sending = fix?.state === 'SENDING';
  const handled =
    pr && dco.missing ? (
      <MarkHandledButton
        prId={pr.prId}
        prNumber={pr.number}
        kinds={['DCO']}
        all={allKindsOf(first, ['DCO'])}
        look="large"
      />
    ) : null;
  return (
    <MoveCard
      tone="red"
      name="dco"
      heading="Your move: sign off the commits"
      pill={<Pill tone="red">Sign-off missing</Pill>}
    >
      <p className="text-sm">
        {repo} requires a <span className="font-mono text-[13px]">Signed-off-by</span> line on every commit, and{' '}
        {dco.canPush ? 'ours' : 'yours'} went out without one. A new commit can&apos;t fix that: it leaves the old ones
        unsigned.
      </p>
      {dco.canPush ? (
        <>
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <span className="text-xs text-muted-foreground">GitRanks adds this line to each of our commits</span>
            <code className="font-mono text-[13px] break-words">
              Signed-off-by: your name &lt;your GitHub noreply address&gt;
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            The code stays the same; the branch is rewritten (a force-push). Signing off certifies the{' '}
            <a href={DCO_URL} target="_blank" rel="noreferrer" className="text-link">
              Developer Certificate of Origin ↗
            </a>
            . From now on GitRanks signs off every commit to {first.nameWithOwner || 'this repo'}.
          </p>
          <div className="flex flex-wrap items-start gap-3">
            <SignOffButton
              attemptId={first.attemptId}
              sending={sending}
              again={fix?.state === 'FAILED'}
              primary={primary}
            />
            {handled}
          </div>
        </>
      ) : (
        <>
          <Steps
            steps={[
              'Run git rebase --signoff on your branch, from where it left the base branch.',
              'Push it with git push --force-with-lease.',
              'The DCO check runs again: this clears once it passes.',
            ]}
          />
          {handled}
        </>
      )}
      {/* Always there, so a screen reader hears each change of the sign-off's state. */}
      <p
        role="status"
        data-sign-off-state={fix ? fix.state.toLowerCase() : undefined}
        className={cn('text-sm', fix?.state === 'FAILED' ? 'text-destructive' : 'text-muted-foreground')}
      >
        {sending
          ? 'Signing off and pushing…'
          : fix?.state === 'FAILED'
            ? `The sign-off did not go through${fix.note ? `: ${clipped(fix.note, 200)}` : '.'} Try again, or sign off by hand: git rebase --signoff, then git push --force-with-lease.`
            : fix?.state === 'DONE' && dco.missing
              ? 'Signed off and pushed. This clears once the DCO check passes.'
              : ''}
      </p>
    </MoveCard>
  );
}

/** Whether `kinds` are every signal on the pull request: an API without `kinds` then clears the same. */
const allKindsOf = (first: ContributeAttemptDetail, kinds: readonly string[]) => {
  const all = new Set((first.needsYou?.signals ?? []).map(({ kind }) => kind));
  return all.size === kinds.length && kinds.every((kind) => all.has(kind as ContributePrSignal['kind']));
};

/** What a run acts on, one line each: the reads' signals, with when. */
function RunItems({ signals, round, now }: { signals: ContributePrSignal[]; round: number; now?: Date }) {
  if (!signals.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Run {round} works on</h3>
      <ul className="flex flex-col gap-2" data-run-items={signals.length}>
        {signals.map((signal) => (
          <li
            key={`${signal.kind}-${signal.at}`}
            data-run-item={signal.kind}
            className="flex items-start gap-2.5 rounded-lg border bg-background px-3.5 py-2.5 text-sm"
          >
            <CheckIcon aria-hidden="true" strokeWidth={2.4} className="mt-0.5 size-4 flex-none text-primary" />
            <span className="min-w-0 break-words">{signalText(signal, now)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Rather answer it yourself? Reply on GitHub ↗ then mark it as handled." */
function AnswerYourself({ first, step }: { first: ContributeAttemptDetail; step: NextStep }) {
  const pr = first.pullRequest;
  const url = githubUrlOf(pr?.url);
  if (!pr || !url || !step.run.kinds.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
      <span>Rather answer it yourself?</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
        Reply on GitHub ↗
      </a>
      <span>then</span>
      <MarkHandledButton
        prId={pr.prId}
        prNumber={pr.number}
        kinds={step.run.kinds}
        all={allKindsOf(first, step.run.kinds)}
        label="mark it as handled"
        look="link"
      />
    </div>
  );
}

/**
 * Autopilot's share of the pull request's runs, while the user's autopilot is on: started so far, and that a run they
 * start turns it off here. Never on a pull request their own agent made: autopilot cannot start that agent.
 */
function AutopilotLine({ first, view }: { first: ContributeAttemptDetail; view: ContributeView }) {
  const contributor = view.contributor;
  const on = !!contributor?.settings?.autopilot && !!contributor.autopilot?.unlocked;
  if (!on || !first.followUps || isOwnAgent(first)) return null;
  return (
    <p data-autopilot-runs={first.followUps.autopilotRuns} className="text-xs text-muted-foreground">
      {autopilotLineOf(first.followUps)}
    </p>
  );
}

/** Why no run can start on the pull request now, by its cause. */
function blockedWhy(first: ContributeAttemptDetail): string {
  if (first.followUps?.currentAttemptId) return 'A follow-up is under way on these comments.';
  if (first.openedBy === 'HAND') {
    return 'You opened this pull request yourself, so no run can add to it: answer these on GitHub.';
  }
  return 'No run can start on this pull request now: answer these on GitHub.';
}

/**
 * The run not started: "Your move: start run N" when a run can act (the items ticked, the note filled in from them),
 * else the card that starts one with the user's own note. With review comments waiting, the comments to choose. While
 * no run can start, what waits is still listed, with why.
 */
function NextRunCard({
  first,
  view,
  step,
  now,
}: {
  first: ContributeAttemptDetail;
  view: ContributeView;
  step: NextStep;
  now?: Date;
}) {
  const pr = first.pullRequest;
  if (!pr) return null;
  const { run } = step;
  const cap = view.contributor?.settings?.attemptCapUsd;
  const limit = typeof cap === 'number' ? ` within your ${usd(cap)} limit per run` : '';
  const hint = run.note ? FILLED_NOTE_HINT : undefined;
  const userWaits = step.user.length > 0 || !!step.dco || !!step.rules;
  // A run that stopped: "Try run N" leads here, so this is the main button.
  const retry = step.user.some((move) => move.kind === 'stopped');
  const feedback = first.reviewFeedback;

  if (feedback?.threads.length) {
    return (
      <div id={RUN_ANCHOR} className="flex scroll-mt-20 flex-col gap-2" data-next-round="comments">
        {run.open && run.signals.length ? (
          <section className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-card p-5 ring-2 ring-primary/10">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={HEADING.card}>Your move: start run {run.round}</h2>
              <Pill tone="violet">Recommended</Pill>
            </div>
            <RunItems signals={run.signals} round={run.round} now={now} />
            <AnswerYourself first={first} step={step} />
          </section>
        ) : null}
        <ReviewFeedbackCard
          // A thread arriving in a later read starts the choices afresh: none is shown chosen but left out.
          key={`${feedback.threads.map((thread) => thread.commentId).join(',')}|${run.note}`}
          prId={pr.prId}
          prNumber={pr.number}
          feedback={feedback}
          canStart={run.open}
          blocked={run.open ? null : blockedWhy(first)}
          attemptCapUsd={cap}
          defaultNote={run.note}
          noteHint={hint}
          now={now}
        />
        <AutopilotLine first={first} view={view} />
      </div>
    );
  }

  const recommended = run.recommended;
  const text = recommended
    ? `GitRanks sees something a run can act on, on #${pr.number}. The agent reads every review, comment and check, fixes what it can and drafts replies, on your Claude key${limit}. Nothing is pushed or posted before you review it.`
    : userWaits
      ? `Think the code needs a change too? Start a run with a note: the agent reads every review, comment and check on #${pr.number}, fixes what it finds, or ends with a note on why nothing needs a change. On your Claude key${limit}.`
      : `GitRanks sees nothing waiting on #${pr.number}. If you think something is wrong, start a run anyway: the agent reads every review, comment and check on the pull request, fixes what it finds, or ends with a note on why nothing needs a change. On your Claude key${limit}.`;
  return (
    <section
      id={RUN_ANCHOR}
      data-next-round={recommended ? 'recommended' : 'own'}
      className={cn(
        'flex scroll-mt-20 flex-col gap-3 rounded-xl border bg-card p-5',
        recommended && 'border-primary/30 ring-2 ring-primary/10',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={HEADING.card}>{recommended ? `Your move: start run ${run.round}` : `Run ${run.round}`}</h2>
        {recommended ? <Pill tone="violet">Recommended</Pill> : null}
      </div>
      <p className="text-sm text-muted-foreground">{run.open ? text : blockedWhy(first)}</p>
      <RunItems signals={run.signals} round={run.round} now={now} />
      {run.open ? (
        <StartFollowUpButton
          // The note filled in afresh when what waits changes.
          key={run.note}
          prId={pr.prId}
          primary={recommended || !userWaits || retry}
          label={`Start run ${run.round}`}
          noteLabel={recommended ? 'A note for the agent' : 'What’s wrong?'}
          notePlaceholder={
            recommended
              ? 'Anything it should know? For example: the lint rule is wrong here, fix the test instead.'
              : 'Tell the agent what you think is wrong.'
          }
          defaultNote={run.note}
          noteHint={hint}
        />
      ) : null}
      <AnswerYourself first={first} step={step} />
      <AutopilotLine first={first} view={view} />
    </section>
  );
}

/**
 * The next step (`?session=next`): every card of what waits on the open pull request, the user's own moves first, then
 * the run's. One main button: the run's when a run can act, else the first of the user's cards.
 */
export function NextStepCards({
  first,
  view,
  now,
}: {
  first: ContributeAttemptDetail;
  view: ContributeView;
  now?: Date;
}) {
  const pr = first.pullRequest;
  if (!pr) return null;
  const step = nextStepOf(first);
  const runLeads = step.run.recommended && step.run.open;
  const cards: ReactNode[] = [];
  const primaryAt = (index: number) => !runLeads && index === 0;

  step.user.forEach((move, index) => {
    const props = { first, step, primary: primaryAt(index), now };
    if (move.kind === 'found') cards.push(<FoundCard key="found" move={move} {...props} />);
    else if (move.kind === 'stopped') cards.push(<StoppedCard key="stopped" move={move} {...props} />);
    else if (move.kind === 'agreement') cards.push(<AgreementCard key="agreement" move={move} {...props} />);
    else cards.push(<TitleCard key="title" move={move} {...props} />);
  });
  if (step.dco) cards.push(<DcoCard key="dco" first={first} dco={step.dco} primary={primaryAt(cards.length)} />);
  if (step.rules) {
    cards.push(
      <PrConventionsCard
        key="rules"
        attemptId={first.attemptId}
        prNumber={pr.number}
        issues={step.rules.issues}
        fix={step.rules.fix}
        title={first.prTitle ?? first.approval?.title ?? ''}
        body={editableBodyOf(first.prBody ?? first.approval?.body ?? first.result?.prBody)}
        conventions={first.conventions ?? null}
      />,
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-4" data-next-step="">
      {cards}
      <NextRunCard first={first} view={view} step={step} now={now} />
    </div>
  );
}

/**
 * On the contribution's other sessions, what waits in one line: "Your move: … · Go to the next step →", or the run at
 * work with the way to it. Nothing when nothing waits.
 */
export function YourMoveLine({
  first,
  shown,
  now = new Date(),
}: {
  first: ContributeAttemptDetail;
  /** The session shown: a run of the pull request is read beside its first attempt. */
  shown: ContributeAttemptDetail;
  now?: Date;
}) {
  const move = yourMoveOf(first, shown.kind === 'FOLLOW_UP' ? [shown] : [], now);
  if (!move) return null;
  const here = attemptPath(shown.attemptId);
  const next = nextSessionPath(first.attemptId);
  const action = move.action && 'href' in move.action ? move.action : null;
  // A run back for review, on its own page: the page is the move.
  if (action?.href === here && (move.kind === 'run-ready' || move.kind === 'run-autopilot')) return null;
  // The way to the move: the next step, or the run it waits on (its review, its replies, the run at work).
  const link =
    action?.href === here
      ? null
      : action && action.href !== next
        ? { href: action.href, label: `${action.label} →` }
        : move.working
          ? null
          : { href: next, label: 'Go to the next step →' };
  return (
    <p
      data-your-move={move.working ? 'working' : 'waiting'}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-primary/20 bg-brand-soft px-4 py-3 text-sm"
    >
      {move.working ? (
        <span className="flex items-center gap-2 font-semibold">
          <LiveDot active />
          {move.pill}
        </span>
      ) : (
        <span className="font-semibold">Your move:</span>
      )}
      <span className="min-w-0 break-words text-foreground/80">{move.move}</span>
      {link ? (
        <Link href={link.href} prefetch={false} scroll={false} className="font-semibold text-link">
          {link.label}
        </Link>
      ) : null}
    </p>
  );
}
