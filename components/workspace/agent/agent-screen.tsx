import { HostedAgentBlock } from './hosted-agent-block';
import { OwnAgentBlock } from './own-agent-block';
import { RunsPreview } from './runs-preview';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { PageTitle } from '@/components/workspace/primitives';
import { isSettled } from '@/lib/workspace/agent-runs';
import { audienceOf } from '@/lib/workspace/audience';
import type {
  ContributeActivity,
  ContributeComingSoonProvider,
  ContributeScheduleCounts,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { type ContributeNotice, contributeNoticesOf } from '@/lib/workspace/contribute-state';
import type { ContributeRunsPage } from '@/lib/workspace/runs';

/** The key's trouble: shown above the hosted block, where it is fixed. */
const KEY_NOTICES: readonly ContributeNotice['kind'][] = ['key-invalid', 'exhausted', 'limit-reached'];

/** What the Agent tab shows, read on the server. */
export type AgentData = {
  view: ContributeView;
  /** Learn is open to the account. */
  learnOpen?: boolean;
  /** The latest runs with the all-time totals; undefined when the read failed. */
  runs?: ContributeRunsPage;
  /** The work in progress, for the learner's "at work now". */
  activity?: ContributeActivity | null;
  /** The providers the user asked to hear about. */
  noted?: readonly ContributeComingSoonProvider[];
  /** The pull requests open or on their way, for when the hosted agent starts its next issue; undefined unread. */
  counts?: ContributeScheduleCounts;
  now?: Date;
};

/**
 * The Agent tab (W1 §9): who does the work. The account's notices on top, then the user's own agent, the hosted agent
 * (the key's notices above it), and a preview of the runs. A learner (Learn alone) sees the hosted agent as one closed
 * line and no spend.
 */
export function AgentScreen({ view, learnOpen = false, runs, activity, noted = [], counts, now }: AgentData) {
  const learner = audienceOf(view.sides, learnOpen) === 'learner';
  const notices = contributeNoticesOf(view);
  // The pause is said in the hosted agent's block, with Resume while it is the user's own.
  const top = notices.filter(({ kind }) => kind !== 'paused' && !KEY_NOTICES.includes(kind));
  const atWork = (activity?.runs ?? []).filter((run) => !isSettled(run)).length;

  return (
    <>
      <PageTitle
        title="Agent"
        text={
          learner
            ? 'Who does the work: your own agent, on your computer, with the plan you already pay for.'
            : 'Who does the work: your own agent on your computer, or the hosted agent on your Claude key.'
        }
      />
      <ContributeNotices notices={top} />
      <OwnAgentBlock ownAgent={view.ownAgent} learnOpen={learnOpen} now={now} />
      <HostedAgentBlock
        view={view}
        learner={learner}
        notices={notices.filter(({ kind }) => KEY_NOTICES.includes(kind))}
        noted={noted}
        counts={counts}
        now={now}
      />
      <RunsPreview page={runs} learner={learner} learnOpen={learnOpen} atWork={atWork} />
    </>
  );
}
