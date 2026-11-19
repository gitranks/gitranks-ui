import type { Route } from 'next';

import { isAsVisitor } from './contribute-state';
import type { WorkspaceTab } from './gate';
import { isTablessPath, WORKSPACE_PATHS } from './paths';

/** Each tab's label and page. */
export const WORKSPACE_TABS: Record<WorkspaceTab, { label: string; href: Route }> = {
  contribute: { label: 'Contribute', href: WORKSPACE_PATHS.contribute },
  learn: { label: 'Learn', href: WORKSPACE_PATHS.learn },
  'pull-requests': { label: 'Pull requests', href: WORKSPACE_PATHS.pullRequests },
  agent: { label: 'Agent', href: WORKSPACE_PATHS.agent },
  settings: { label: 'Settings', href: WORKSPACE_PATHS.settings },
};

/** Whether `path` is `prefix` or a page under it. */
const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * The tab a page belongs to; null for none. Learn's own pages that have no tab of their own yet (the user's lessons,
 * goal and level, the start page for one issue) are Learn's; an attempt's page is the pull requests'. A Start page
 * is the Learn tab's for a lesson (`?lesson=1`), else Contribute's.
 */
export function activeTabOf(pathname: string, search: Pick<URLSearchParams, 'get'>): WorkspaceTab | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith('/my/start/')) return search.get('lesson') === '1' ? 'learn' : 'contribute';
  if (path === '/contribute' || path === '/contribute/issues') return 'contribute';
  if (path.startsWith('/contribute/attempts/') || path.startsWith('/learn/attempts/')) return 'pull-requests';
  if (
    path === '/learn' ||
    path === '/learn/lessons' ||
    path === '/learn/profile' ||
    path.startsWith('/learn/start/') ||
    path === '/my/progress'
  ) {
    return 'learn';
  }
  if (under(path, WORKSPACE_PATHS.pullRequests)) return 'pull-requests';
  if (under(path, WORKSPACE_PATHS.agent)) return 'agent';
  if (under(path, WORKSPACE_PATHS.settings)) return 'settings';
  return null;
}

/**
 * Whether the tabs show at all: only where the gate gives some, not on the pages about Contribute and Learn, and not
 * under `?as=visitor` on `/contribute`, where a signed-in user sees the landing as a visitor would.
 */
export function workspaceTabsShown(pathname: string, as: string | null, tabs: readonly WorkspaceTab[]): boolean {
  const asVisitor = pathname.replace(/\/+$/, '') === WORKSPACE_PATHS.contribute && isAsVisitor(as);
  return tabs.length > 0 && !asVisitor && !isTablessPath(pathname);
}
