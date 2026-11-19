import { redirect } from 'next/navigation';

import { AgentScreen } from './agent-screen';
import {
  loadContribute,
  loadContributeActivity,
  loadContributeSetup,
  loadProviderInterests,
} from '@/lib/workspace/contribute.data';
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import { loadLearnOpen } from '@/lib/workspace/gate.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { RUNS_PREVIEW_SIZE } from '@/lib/workspace/runs';
import { loadRuns } from '@/lib/workspace/runs.data';
import { contributeHidden } from '@/lib/workspace/setting-up';

/** The Agent tab's reads: the user, whether Learn is open, the latest runs (all time), the runs at work, the providers noted. */
export async function AgentView() {
  const [view, learnOpen, runs, activity, noted] = await Promise.all([
    loadContribute(),
    loadLearnOpen(),
    loadRuns({}, { size: RUNS_PREVIEW_SIZE }),
    loadContributeActivity().catch(() => null),
    loadProviderInterests(),
  ]);
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'settings')) redirect(WORKSPACE_PATHS.contribute);
  return <AgentScreen view={view} learnOpen={learnOpen} runs={runs} activity={activity} noted={noted} />;
}
