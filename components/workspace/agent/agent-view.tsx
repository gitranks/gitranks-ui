import { redirect } from 'next/navigation';

import { AgentScreen } from './agent-screen';
import {
  loadContribute,
  loadContributeActivity,
  loadContributeSetup,
  loadProviderInterests,
  loadScheduleCounts,
} from '@/lib/workspace/contribute.data';
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import { loadLearnOpen } from '@/lib/workspace/gate.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { RUNS_PREVIEW_SIZE } from '@/lib/workspace/runs';
import { loadRuns } from '@/lib/workspace/runs.data';
import { contributeHidden } from '@/lib/workspace/setting-up';

/**
 * The Agent tab's reads: the user, whether Learn is open, the latest runs (all time), the runs at work, the providers
 * noted, and the pull requests against the limit (when the hosted agent starts its next issue).
 */
export async function AgentView() {
  const [view, learnOpen, runs, activity, noted, counts] = await Promise.all([
    loadContribute(),
    loadLearnOpen(),
    loadRuns({}, { size: RUNS_PREVIEW_SIZE }),
    loadContributeActivity().catch(() => null),
    loadProviderInterests(),
    loadScheduleCounts(),
  ]);
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'settings')) redirect(WORKSPACE_PATHS.contribute);
  return (
    <AgentScreen view={view} learnOpen={learnOpen} runs={runs} activity={activity} noted={noted} counts={counts} />
  );
}
