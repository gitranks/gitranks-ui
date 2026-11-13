import type { Route } from 'next';
import type { ReactNode } from 'react';

import { type AlsoRow, AlsoWaiting, HeadSwitch, HeldCard, StartAnyway } from './also-waiting';
import { StartRun } from './head-actions';
import type { CardProps } from './move-props';
import { AutopilotCard, GrantCard, RetryCard, ReviewCard } from './moves-first';
import { AgreementCard, NextRunCard, RulesCard } from './moves-pr';
import { RepliesCard, ReplyFailedCard, RunAutopilotCard, RunGrantCard, RunReadyCard } from './moves-run';
import { DcoCard, FoundCard, RepoOutCard, SilentCard, StoppedCard } from './moves-yours';
import { ProofMoveCard, ProofStatus } from './proof-card';
import { ClaimSteps, StatusLine, StatusLinkView } from './status-line';
import { LiveSubmit, SubmitStepsSettled } from './submit-stepper';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import {
  type ContributionMoves,
  elsewhereLabelOf,
  headOf,
  type Move,
  type Pane,
  runRoundOf,
} from '@/lib/contribute/contribution-moves';
import type { OrgAccess } from '@/lib/contribute/org-access';
import { firstStatusOf, nextStatusOf, runStatusOf, type SessionStatus } from '@/lib/contribute/session-status';
import { attemptPath, nextSessionPath, sessionPath, waitingThreadsOf } from '@/lib/contribute/sessions';

/** The proof's stages that wait for nobody: a status line, or one line under the card. */
const PASSIVE_PROOF: ReadonlySet<string> = new Set(['working', 'posting', 'posted', 'ask-cleared']);

/** A move's address: its session, with `move=` naming it. */
export function moveHrefOf(firstId: string, move: Pick<Move, 'session' | 'kinds'>): Route {
  const kind = encodeURIComponent(move.kinds[0]);
  if (move.session === 'next' || move.session === 'proof') return `${nextSessionPath(firstId)}&move=${kind}` as Route;
  if (move.session === 'first') return `${attemptPath(firstId)}?move=${kind}` as Route;
  return `${sessionPath(firstId, move.session.slice(4))}?move=${kind}` as Route;
}

/** The card a move draws. */
function Card(props: CardProps) {
  switch (props.move.card) {
    case 'review':
    case 'own-review':
      return <ReviewCard {...props} />;
    case 'grant':
      return props.move.data.card === 'grant' && props.move.data.run ? (
        <RunGrantCard {...props} />
      ) : (
        <GrantCard {...props} />
      );
    case 'autopilot':
      return <AutopilotCard {...props} />;
    case 'retry':
      return <RetryCard {...props} />;
    case 'run-ready':
      return <RunReadyCard {...props} />;
    case 'run-autopilot':
      return <RunAutopilotCard {...props} />;
    case 'reply-failed':
      return <ReplyFailedCard {...props} />;
    case 'replies':
      return <RepliesCard {...props} />;
    case 'next-run':
      return <NextRunCard {...props} />;
    case 'agreement':
      return <AgreementCard {...props} />;
    case 'rules':
      return <RulesCard {...props} />;
    case 'dco':
      return <DcoCard {...props} />;
    case 'found':
      return <FoundCard {...props} />;
    case 'stopped':
      return <StoppedCard {...props} />;
    case 'repo-out':
      return <RepoOutCard {...props} />;
    case 'silent':
      return <SilentCard {...props} />;
    case 'proof':
      return <ProofMoveCard {...props} />;
  }
}

/**
 * "Start a run anyway": a run with the user's own note when nothing a run would act on waits. Its start's error shows
 * under its own button, wherever it rides.
 */
function StartAnywayRider({ model }: { model: ContributionMoves }) {
  return (
    <StartAnyway>
      <StartRun
        card="anyway"
        id="note-anyway"
        label={`Start run ${model.nextRound}`}
        noteLabel="What’s wrong?"
        placeholder="Tell the agent what you think is wrong."
        hint={undefined}
        primary={false}
        errorHere
      />
    </StartAnyway>
  );
}

export type SessionHeadProps = {
  model: ContributionMoves;
  pane: Pane;
  /** `?move=`: the held card to show; an unknown or stale value is ignored. */
  move?: string | null;
  first?: ContributeAttemptDetail;
  /** The session shown: the first attempt, or the run. */
  shown: ContributeAttemptDetail;
  /** The run under way, read beside the first attempt. */
  current?: ContributeAttemptDetail;
  view: ContributeView;
  now: Date;
  orgAccess: OrgAccess;
};

/**
 * The pane's head: a move card when the pane holds a move (the one `?move=` names, else its first; the rest it holds
 * rendered and hidden, to swap in place), with every other move of the contribution under it; else one status line,
 * ending with the move another session holds.
 */
export function SessionHead({ model, pane, move, first, shown, current, view, now, orgAccess }: SessionHeadProps) {
  const head = headOf(model, pane, move);
  const blocked = model.hardStop?.blocked ?? new Set();
  const firstId = first?.attemptId ?? shown.attemptId;
  const runOf = (one: Move) => {
    const id =
      one.data.card === 'reply-failed' || one.data.card === 'replies'
        ? one.data.runId
        : 'attemptId' in one.data
          ? one.data.attemptId
          : null;
    if (!id) return undefined;
    if (shown.attemptId === id) return shown;
    if (current?.attemptId === id) return current;
    return undefined;
  };
  const nextRunHeld = model.moves.some(({ card }) => card === 'next-run');
  // The proof's line only for the stages that wait for nobody; a stage that waits is a move (or held back by a stop).
  const passiveProof = !!model.proofStage && PASSIVE_PROOF.has(model.proofStage);
  const proofLine =
    pane === 'next' && first && passiveProof ? (
      <ProofStatus first={first} stage={model.proofStage} now={now} compact />
    ) : null;
  const anyway = pane === 'next' && model.mayStart && !nextRunHeld;

  if (head.kind === 'card') {
    const rowsOf = (card: Move): AlsoRow[] =>
      model.moves
        .filter((each) => each !== card)
        .map((each) => ({
          id: each.kinds[0],
          chip: each.chip,
          tone: each.tone,
          title: each.title,
          href: head.held.includes(each) ? null : moveHrefOf(firstId, each),
        }));
    return (
      <HeadSwitch held={head.held.map(({ kinds }) => ({ id: kinds[0], kinds }))}>
        {head.held.map((card) => (
          <HeldCard key={card.kinds[0]} id={card.kinds[0]}>
            <Card
              move={card}
              model={model}
              first={first}
              run={runOf(card)}
              view={view}
              now={now}
              blocked={blocked}
              orgAccess={orgAccess}
              rider={<AlsoWaiting rows={rowsOf(card)} />}
            />
          </HeldCard>
        ))}
        {proofLine || anyway ? (
          <div className="flex flex-col gap-3 px-1 pt-3" data-head-rider="">
            {proofLine}
            {anyway ? <StartAnywayRider model={model} /> : null}
          </div>
        ) : null}
      </HeadSwitch>
    );
  }

  const elsewhere = head.elsewhere;
  const moveLink = elsewhere ? (
    <StatusLinkView
      link={{ href: moveHrefOf(firstId, elsewhere), label: elsewhereLabelOf(elsewhere), external: false }}
    />
  ) : null;

  /** A status line, the move link in its link's place (the line's own link then in Details). */
  const line = (status: SessionStatus, extra?: ReactNode) => (
    <div data-session-head="status" tabIndex={-1} className="outline-none">
      <StatusLine
        name={status.name}
        lead={status.lead}
        title={status.title}
        fact={status.fact}
        bar={status.bar}
        live={status.live}
        link={moveLink ?? (status.link ? <StatusLinkView link={status.link} /> : null)}
        details={
          status.details.length || extra || (moveLink && status.link) ? (
            <>
              {status.details.map((detail) => (
                <p key={detail}>{detail}</p>
              ))}
              {extra}
              {moveLink && status.link ? (
                <p>
                  <StatusLinkView link={status.link} />
                </p>
              ) : null}
            </>
          ) : null
        }
      />
    </div>
  );

  if (pane === 'next' && first) {
    const pr = first.pullRequest;
    const rider = anyway ? <StartAnywayRider model={model} /> : null;
    const proof = passiveProof ? (
      <ProofStatus first={first} stage={model.proofStage} now={now} details={rider} moveLink={moveLink} />
    ) : null;
    if (proof) {
      return (
        <div data-session-head="status" tabIndex={-1} className="outline-none">
          {proof}
        </div>
      );
    }
    const status = nextStatusOf({
      prNumber: pr?.number ?? 0,
      prUrl: githubUrlOf(pr?.url),
      waiting: waitingThreadsOf(first).length,
      noRun: model.noRun,
      signingOff: model.signingOff,
    });
    return line(status, rider);
  }

  if (shown.kind === 'FOLLOW_UP') {
    const entry = first?.followUps?.history?.find(({ attemptId }) => attemptId === shown.attemptId);
    const latest = first?.followUps?.history?.at(-1)?.attemptId === shown.attemptId;
    const round = runRoundOf(first, shown) ?? entry?.round ?? null;
    const status = runStatusOf(shown, {
      now,
      round,
      entry,
      prUrl: githubUrlOf(first?.pullRequest?.url ?? shown.followUpOf?.url),
      reading: model.reading && latest,
    });
    return line(status);
  }

  if (shown.state === 'SUBMITTING' && shown.submit?.step !== 'WAITING_CAP') {
    return (
      <div data-session-head="status" tabIndex={-1} className="outline-none">
        <LiveSubmit
          attempt={{
            attemptId: shown.attemptId,
            state: shown.state,
            updatedAt: shown.updatedAt,
            submit: shown.submit,
            pullRequest: shown.pullRequest,
          }}
          now={now}
        />
      </div>
    );
  }
  const status = firstStatusOf(shown, {
    now,
    current,
    runNumber: current ? runRoundOf(shown, current) : null,
    elsewhere: !!elsewhere,
  });
  const extra =
    shown.state === 'CLAIMING' && shown.claimSteps ? (
      <ClaimSteps steps={shown.claimSteps} />
    ) : (status.name === 'PR_OPENED' || status.name === 'SUBMIT_FAILED') && shown.submit ? (
      <SubmitStepsSettled submit={shown.submit} />
    ) : null;
  return line(status, extra);
}
