import 'server-only';

import { IssuesLive } from '@/components/learn/issues/issues-live';
import type { IssuesLayer } from '@/components/learn/issues/issues-screen';
import type { FixesLayer } from '@/components/learn/issues/real-projects-screen';
import { type IssuesAt, type IssuesNames, type IssuesView, isOwnView } from '@/lib/learn/issues';
import { loadIssuesListPublic, loadLearnFixes } from '@/lib/learn/issues.data';

/** The merged fixes of a view as a layer: the first ten, or the API answering none, or a failure. */
async function fixesLayerOf(view: IssuesView): Promise<FixesLayer> {
  const fixes = await loadLearnFixes(view);
  return fixes.kind === 'ok' ? { kind: 'fixed', fixes: fixes.data } : { kind: fixes.kind };
}

/** The five every visitor sees for a view as a layer, or the API answering none, or a failure. */
async function visitorLayerOf(view: IssuesView): Promise<IssuesLayer> {
  const list = await loadIssuesListPublic(view);
  return list.kind === 'ok' ? { kind: 'visitor', rows: list.data.rows } : { kind: list.kind };
}

/**
 * The public layer of Issues for a view, read with no session: the merged fixes when the view shows them alone, else
 * the five every visitor sees; the API answering none (or not knowing the read yet) is the unavailable state. The
 * person's own five are read later in the browser.
 */
export async function issuesLayerOf(view: IssuesView): Promise<IssuesLayer> {
  return view.show === 'fixed' ? fixesLayerOf(view) : visitorLayerOf(view);
}

/**
 * The public layers of a view: the list's (`initial`) and, on a lesson's or a course's own address showing both
 * groups, the merged fixes of the "Fixed" group, read at once.
 */
export async function issuesLayersOf(
  view: IssuesView,
  at: IssuesAt,
): Promise<{ initial: IssuesLayer; fixes: FixesLayer | null }> {
  const both = view.show === 'both' && isOwnView(view, at);
  const [initial, fixes] = await Promise.all([issuesLayerOf(view), both ? fixesLayerOf(view) : null]);
  return { initial, fixes };
}

export { issuesNamesOf } from '@/lib/learn/issues.data';

/** Issues, or a lesson's or a course's view of it, as every page of them draws it. */
export async function IssuesPage({ view, at, names }: { view: IssuesView; at: IssuesAt; names: IssuesNames }) {
  const { initial, fixes } = await issuesLayersOf(view, at);
  return <IssuesLive view={view} at={at} names={names} initial={initial} fixes={fixes} />;
}
