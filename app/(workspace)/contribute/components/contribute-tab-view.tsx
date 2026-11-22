import { type ContributeTabData, ContributeTabScreen } from './contribute-tab';
import { filterOf } from '@/app/contribute/components/issues-filter';
import { loadContributeTab, loadIssues } from '@/lib/contribute/contribute.data';
import {
  loadContributeActivity,
  loadContributeSet,
  loadFairUseNotices,
  loadScheduleCounts,
} from '@/lib/workspace/contribute.data';
import { isSuspended } from '@/lib/workspace/contribute-state';

/** The tab's reads, all at once beside the user's view (read by the page before): one that fails leaves its part out. */
export async function ContributeTab({
  view,
  agents,
  learnOpen,
  query,
}: Pick<ContributeTabData, 'view' | 'agents' | 'learnOpen' | 'query'>) {
  const [tab, page, set, activity, counts, fairUse] = await Promise.all([
    loadContributeTab(),
    isSuspended(view) ? Promise.resolve(null) : loadIssues(filterOf(query)),
    loadContributeSet().catch(() => undefined),
    loadContributeActivity().catch(() => null),
    loadScheduleCounts(),
    loadFairUseNotices(),
  ]);
  return (
    <ContributeTabScreen
      view={view}
      agents={agents}
      learnOpen={learnOpen}
      tab={tab}
      page={page}
      set={set}
      activity={activity}
      counts={counts}
      fairUse={fairUse}
      query={query}
    />
  );
}
