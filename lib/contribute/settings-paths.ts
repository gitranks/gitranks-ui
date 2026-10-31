import type { Route } from 'next';

import type { ContributeSetListMode } from './contribute.types';

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
 * summary sends an old link (a bookmark, a notice) on to it. Anchors not here stay on the summary: what you work on
 * (`#modes`), and the filters (`#work`), rules and ignored repos, whose dialogs open at their anchor.
 */
const ANCHORS: Record<string, Route> = {
  limits: SETTINGS_PATHS.budget,
  pacing: `${SETTINGS_PATHS.budget}#pacing` as Route,
  'more-limits': `${SETTINGS_PATHS.budget}#more-limits` as Route,
  agent: SETTINGS_PATHS.agent,
  prs: `${SETTINGS_PATHS.agent}#prs` as Route,
  access: SETTINGS_PATHS.keys,
  'own-agent': SETTINGS_PATHS.ownAgent,
};

/** The guided switch to a mode with a list. */
export const switchPathOf = (mode: ContributeSetListMode): Route =>
  `/contribute/settings/switch/${mode.toLowerCase()}` as Route;

/** The mode a switch page's segment names, or null for any other segment. */
export const switchModeOf = (segment: string): ContributeSetListMode | null =>
  segment === 'stack' ? 'STACK' : segment === 'repos' ? 'REPOS' : null;

/** The page an old Settings `#anchor` is on now, or null when it stays on the summary. */
export const movedAnchorOf = (anchor: string): Route | null =>
  Object.hasOwn(ANCHORS, anchor) ? ANCHORS[anchor] : null;

/** Where a Settings section is: its own page, or the summary at its anchor. */
export const settingsPathOf = (anchor: string): Route =>
  movedAnchorOf(anchor) ?? (`${SETTINGS_PATHS.summary}#${anchor}` as Route);
