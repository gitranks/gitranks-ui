/**
 * Old workspace addresses (2026-11). Remove after 2027-03-01.
 *
 * The signed-in pages moved under `/my` (the Pull requests, Agent and Settings tabs); the old addresses send bookmarks,
 * sent emails and agents' links on to the new ones. A static redirect keeps the whole query; a hash never reaches the
 * server, and the browser keeps it across the redirect, which the Settings tab's anchors read. Temporary (307): no
 * browser should keep them for ever. A row that matches on the query comes before the plain row of the same path.
 *
 * Kept free of imports: the Next config reads it before the app is built.
 */
export type OldAddressRedirect = {
  source: string;
  destination: string;
  permanent: false;
  has?: { type: 'query'; key: string; value?: string }[];
};

/** One row: the old path with or without its trailing slash (the site keeps the path as asked), to the new one. */
const to = (source: string, destination: string, has?: OldAddressRedirect['has']): OldAddressRedirect => ({
  source: `${source}{/}?`,
  destination,
  permanent: false,
  ...(has ? { has } : {}),
});

export const OLD_WORKSPACE_REDIRECTS: OldAddressRedirect[] = [
  // The landing's old ways in: an agent sending its person to connect it (`?start=agent`, which the agent server and
  // the agents' page print), and a new account's way back to the Claude key. Both are steps of Contribute's flow now.
  to('/contribute', '/contribute/start/agent/own?from=agent', [{ type: 'query', key: 'start', value: 'agent' }]),
  to('/contribute', '/contribute/start/agent/key', [{ type: 'query', key: 'start', value: 'key' }]),
  // How Contribute works, for members: a page of its own.
  to('/contribute', '/contribute/about', [{ type: 'query', key: 'about', value: '1' }]),
  // Issues for you is the Contribute tab's list now: its filters kept, at the list (an old `?after=` is ignored there).
  to('/contribute/issues', '/contribute#issues'),
  to('/contribute/me', '/my/pull-requests'),
  to('/contribute/runs', '/my/agent/runs'),
  // The own agent's way in, then the Claude key's. GitHub's access has its own Settings page.
  to('/contribute/connect', '/my/agent/connect', [{ type: 'query', key: 'path', value: 'agent' }]),
  to('/contribute/connect', '/my/agent/key'),
  to('/contribute/settings', '/my/settings'),
  to('/contribute/settings/work', '/my/settings/work'),
  to('/contribute/settings/switch/:mode', '/my/settings/work/switch/:mode'),
  to('/contribute/settings/budget', '/my/agent/budget'),
  to('/contribute/settings/agent', '/my/agent/model'),
  // GitHub's consent came back here with `?grant=`: its answer is on GitHub's own page now, the query kept.
  to('/contribute/settings/keys', '/my/settings/github', [{ type: 'query', key: 'grant' }]),
  to('/contribute/settings/keys', '/my/agent/key'),
  to('/contribute/settings/own-agent', '/my/agent'),
  // A contribution's page and its runs: the address by attempt reads the attempt and goes on to the pull request's
  // page by repo and issue, the query kept (`?resume=`, `?move=`, `?session=next`).
  to('/contribute/attempts/:id/runs/:runId', '/my/pull-requests/by-attempt/:runId'),
  to('/contribute/attempts/:id', '/my/pull-requests/by-attempt/:id'),
  // A lesson's page: the address by attempt opens the view its stage names, the query kept.
  to('/learn/attempts/:id', '/my/pull-requests/by-attempt/:id'),
  // My lessons: Learn's Progress now. Only the list itself: a shared lesson's page under it stays.
  to('/learn/lessons', '/learn/progress'),
];

/**
 * A pull request's old Lesson view, which emails and pull requests already sent link: the fixer's walkthrough, and on
 * an earlier attempt that attempt's page (its walkthrough is read from there). Permanent: the view is gone for good.
 */
export const LESSON_VIEW_REDIRECTS = [
  {
    source: '/my/pull-requests/:owner/:repo/:issue/lesson{/}?',
    destination: '/my/pull-requests/:owner/:repo/:issue/walkthrough',
    permanent: true,
  },
  {
    source: '/my/pull-requests/:owner/:repo/:issue/earlier/:attemptId/lesson{/}?',
    destination: '/my/pull-requests/:owner/:repo/:issue/earlier/:attemptId',
    permanent: true,
  },
] as const satisfies { source: string; destination: string; permanent: true }[];

/**
 * Learn's pages that went away, and where each leads now (permanent: they are gone for good). The Learn tab before
 * courses and its flow's pick of an issue are Issues now; the earlier Your progress is Progress; the flow's first step and the goal and level page are Set up
 * Learn; the page for maintainers is the part about Learn of Contribute's page for maintainers, with the query kept (the
 * `from` its footer links carry; the browser puts the query before the part's anchor). An issue's own start address
 * under the flow depends on the person, so a route answers it (`app/learn/start/[owner]/[repo]/[issue]/route.ts`).
 */
export const OLD_LEARN_REDIRECTS = [
  { source: '/learn/earlier{/}?', destination: '/learn/issues', permanent: true },
  { source: '/learn/start/issues{/}?', destination: '/learn/issues', permanent: true },
  { source: '/learn/start{/}?', destination: '/learn/setup', permanent: true },
  { source: '/my/settings/goal{/}?', destination: '/learn/setup', permanent: true },
  // Learn's goal and level: Set up Learn now.
  { source: '/learn/profile{/}?', destination: '/learn/setup', permanent: true },
  { source: '/learn/maintainers{/}?', destination: '/contribute/maintainers#learn', permanent: true },
  // The earlier Your progress: Learn's Progress now.
  { source: '/my/progress{/}?', destination: '/learn/progress', permanent: true },
] as const satisfies { source: string; destination: string; permanent: true }[];
