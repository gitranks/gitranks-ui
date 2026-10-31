import type { Route } from 'next';

/** Settings, a summary of every setting, and the pages each one is changed on. */
export const SETTINGS_PATHS = {
  summary: '/contribute/settings' as Route,
  work: '/contribute/settings/work' as Route,
  budget: '/contribute/settings/budget' as Route,
  agent: '/contribute/settings/agent' as Route,
  keys: '/contribute/settings/keys' as Route,
  ownAgent: '/contribute/settings/own-agent' as Route,
};

/**
 * Where each section of the one long Settings page now lives, by its old `#anchor`. Links in the app use it, and the
 * summary sends an old link (a bookmark, a notice) on to it. Anchors not here stay on the summary.
 */
const ANCHORS: Record<string, Route> = {
  modes: SETTINGS_PATHS.work,
  work: `${SETTINGS_PATHS.work}#work` as Route,
  rules: `${SETTINGS_PATHS.work}#rules` as Route,
  ignored: `${SETTINGS_PATHS.work}#ignored` as Route,
  limits: SETTINGS_PATHS.budget,
  pacing: `${SETTINGS_PATHS.budget}#pacing` as Route,
  agent: SETTINGS_PATHS.agent,
  prs: `${SETTINGS_PATHS.agent}#prs` as Route,
  access: SETTINGS_PATHS.keys,
  'own-agent': SETTINGS_PATHS.ownAgent,
};

/** The page an old Settings `#anchor` is on now, or null when it stays on the summary. */
export const movedAnchorOf = (anchor: string): Route | null =>
  Object.hasOwn(ANCHORS, anchor) ? ANCHORS[anchor] : null;

/** Where a Settings section is: its own page, or the summary at its anchor. */
export const settingsPathOf = (anchor: string): Route =>
  movedAnchorOf(anchor) ?? (`${SETTINGS_PATHS.summary}#${anchor}` as Route);
