import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PullRequestListPageView } from './list-view';
import { Unavailable } from './page-read';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { audienceOf } from '@/lib/workspace/audience';
import { withBlockedWalkthroughs } from '@/lib/workspace/blocked-walkthrough';
import { loadContribute, loadContributeSetup } from '@/lib/workspace/contribute.data';
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import { PICK_ISSUE_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { loadBlockedWalkthroughs, loadPullRequestList } from '@/lib/workspace/pull-request.data';
import { contributeHidden } from '@/lib/workspace/setting-up';
import { LAST_BAR_COOKIE, lastBarOf, settingsBarOf } from '@/lib/workspace/settings-bar';

type Search = Record<string, string | string[] | undefined>;

/**
 * The Pull requests tab: the person's fixes in Learn and Contribute, by who has to act. Its old filters (`state`,
 * `made`, `page`) are left as they are in the address: the list is the same whatever they say. The empty page leads to
 * the issues of the product the person came from. A walkthrough of an older version that waits for another pass is read
 * apart and marked on its row; without that read the row is as the list says.
 */
export async function PullRequestListPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [view, read, query, jar] = await Promise.all([
    loadContribute(),
    loadPullRequestList(),
    searchParams,
    cookies(),
  ]);
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'me')) redirect(WORKSPACE_PATHS.contribute);
  if (!read) return <Unavailable />;
  // Only a Learn fix on its walkthrough can wait for another pass: the list asks only then.
  const walkthrough = read.rows.some((row) => row.made === 'LEARN' && row.box === 'WALKTHROUGH');
  const list = walkthrough ? withBlockedWalkthroughs(read, await loadBlockedWalkthroughs()) : read;
  const side = settingsBarOf({
    from: query.from,
    lastBar: lastBarOf(jar.get(LAST_BAR_COOKIE)?.value),
    audience: audienceOf(view.sides),
  });
  return (
    <PullRequestListPageView
      list={list}
      now={new Date()}
      side={side}
      issuesHref={side === 'learn' ? LEARN_HOME_PATH : PICK_ISSUE_PATHS.fix}
    />
  );
}
