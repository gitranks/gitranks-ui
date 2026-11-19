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
  to('/contribute/me', '/my/pull-requests'),
  to('/contribute/runs', '/my/agent/runs'),
  // The own agent's way in, then the Claude key's (which holds GitHub's access too, until it has a page of its own).
  to('/contribute/connect', '/my/agent/connect', [{ type: 'query', key: 'path', value: 'agent' }]),
  to('/contribute/connect', '/my/agent/key'),
  to('/contribute/settings', '/my/settings'),
  to('/contribute/settings/work', '/my/settings/work'),
  to('/contribute/settings/switch/:mode', '/my/settings/work/switch/:mode'),
  to('/contribute/settings/budget', '/my/agent/budget'),
  to('/contribute/settings/agent', '/my/agent/model'),
  // GitHub's consent comes back with `?grant=`, kept by the redirect.
  to('/contribute/settings/keys', '/my/agent/key'),
  to('/contribute/settings/own-agent', '/my/agent'),
];
