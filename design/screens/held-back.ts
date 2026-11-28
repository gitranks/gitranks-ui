import type { Screen } from '../registry';
import { CONTRIBUTE_AUTHORIZE_SCREENS } from './contribute-authorize';
import { LEARN_ENTITY_PART_SCREENS } from './learn-entity-parts';
import { LEARN_FIX_SCREENS } from './learn-fix';
import { LEARN_ISSUES_SCREENS } from './learn-issues';
import { LEARN_PROGRESS_FIXES_SCREENS } from './learn-progress-fixes';
import { LEARN_REAL_ISSUES_SCREENS } from './learn-real-issues';
import { LEARN_WALKTHROUGH_SCREENS } from './learn-walkthrough';
import { SKILLS_PART_SCREENS } from './skills-parts';
import { WORKSPACE_ISSUE_LEARN_SCREENS } from './workspace-issue-learn';
import { WORKSPACE_PR_PART_SCREENS } from './workspace-pr-parts';

/**
 * The screens drawn here only, held back from the export (`exported: false`) until the pages they belong to switch to
 * them. Every one is listed here: `held-back.spec.tsx` draws each of their states, and the export stops when a screen
 * carries the flag without being listed.
 */
export const HELD_BACK_SCREENS: Screen[] = [
  ...WORKSPACE_PR_PART_SCREENS,
  ...SKILLS_PART_SCREENS,
  ...LEARN_ENTITY_PART_SCREENS,
  ...LEARN_ISSUES_SCREENS,
  ...LEARN_REAL_ISSUES_SCREENS,
  ...LEARN_WALKTHROUGH_SCREENS,
  ...LEARN_FIX_SCREENS,
  ...LEARN_PROGRESS_FIXES_SCREENS,
  ...WORKSPACE_ISSUE_LEARN_SCREENS,
  ...CONTRIBUTE_AUTHORIZE_SCREENS,
];
