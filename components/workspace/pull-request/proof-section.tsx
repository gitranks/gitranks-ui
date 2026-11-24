import { ProofMoveCard } from './proof-card';
import { SessionActionsProvider } from './session-actions';
import type {
  ContributeAttemptDetail,
  ContributePrNotes,
  ContributeReplyWaiting,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { contributionMovesOf } from '@/lib/workspace/contribution-moves';
import { orgAccessOf } from '@/lib/workspace/org-access';
import { PROOF_ANCHOR } from '@/lib/workspace/pull-request-page';

/**
 * A bot asks for proof that the fix works: today's proof card, under the box, with every step it has (connect the
 * agent, check what it captured, post it, answer the bot). Nothing while the pull request has no proof to give.
 */
export function ProofSection({
  view,
  first,
  current,
  replies,
  prNotes,
  now,
}: {
  view: ContributeView;
  first: ContributeAttemptDetail;
  current?: ContributeAttemptDetail;
  replies?: ContributeReplyWaiting[];
  prNotes?: ContributePrNotes;
  now: Date;
}) {
  const model = contributionMovesOf({ view, first, current, shown: first, replies, prNotes, now });
  const move = model.moves.find(({ data }) => data.card === 'proof');
  if (!move) return null;
  const blocked = model.hardStop?.blocked ?? new Set();
  return (
    <section id={PROOF_ANCHOR} className="scroll-mt-24" data-proof-section="">
      <SessionActionsProvider
        init={{
          session: 'first',
          prId: first.pullRequest?.prId ?? null,
          prNumber: first.pullRequest?.number ?? null,
          attemptId: first.attemptId,
          runState: null,
          approvedAt: first.approvedAt,
          flow: false,
          checkStatus: first.checkStatus?.status ?? null,
          hasCommits: !!first.patch?.trim(),
          drafts: [],
          threads: [],
          resolveHumans: undefined,
          blocked,
          canStart: false,
        }}
      >
        <ProofMoveCard
          move={move}
          model={model}
          first={first}
          run={current}
          view={view}
          now={now}
          blocked={blocked}
          orgAccess={orgAccessOf()}
          rider={null}
        />
      </SessionActionsProvider>
    </section>
  );
}
