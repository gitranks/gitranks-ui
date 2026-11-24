import type { Screen } from '../registry';
import { WORKSPACE_PR_PART_SCREENS } from './workspace-pr-parts';

/**
 * The screens drawn here only, held back from the export (`exported: false`) until the pages they belong to switch to
 * them. Every one is listed here: `held-back.spec.tsx` draws each of their states, and the export stops when a screen
 * carries the flag without being listed.
 */
export const HELD_BACK_SCREENS: Screen[] = [...WORKSPACE_PR_PART_SCREENS];
