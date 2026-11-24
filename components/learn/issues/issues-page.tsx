import 'server-only';

import { IssuesLive } from '@/components/learn/issues/issues-live';
import type { IssuesLayer } from '@/components/learn/issues/issues-screen';
import type { IssuesAt, IssuesNames, IssuesView } from '@/lib/learn/issues';
import { loadIssuesListPublic, loadLearnFixes } from '@/lib/learn/issues.data';

/**
 * The public layer of Issues for a view, read with no session: the merged fixes when "Fixed" is set, else the five
 * every visitor sees; the API answering none (or not knowing the read yet) is the unavailable state. The person's own
 * five are read later in the browser.
 */
export async function issuesLayerOf(view: IssuesView): Promise<IssuesLayer> {
  if (view.fixed) {
    const fixes = await loadLearnFixes(view);
    return fixes.kind === 'ok' ? { kind: 'fixed', fixes: fixes.data } : { kind: fixes.kind };
  }
  const list = await loadIssuesListPublic(view);
  return list.kind === 'ok' ? { kind: 'visitor', rows: list.data.rows } : { kind: list.kind };
}

export { issuesNamesOf } from '@/lib/learn/issues.data';

/** Issues, or a lesson's or a course's view of it, as every page of them draws it. */
export async function IssuesPage({ view, at, names }: { view: IssuesView; at: IssuesAt; names: IssuesNames }) {
  const initial = await issuesLayerOf(view);
  return <IssuesLive view={view} at={at} names={names} initial={initial} />;
}
