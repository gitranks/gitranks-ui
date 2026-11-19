import type { Screen } from '../registry';
import { ADMIN_SCREENS } from './admin';
import { BADGES_SCREENS } from './badges';
import { CONTRIBUTE_SCREENS } from './contribute';
import { LANDING_SCREENS } from './landing';
import { LEARN_SCREENS } from './learn';
import { ORG_SCREENS } from './org';
import { PACKAGE_SCREENS } from './package';
import { PROFILE_SCREENS } from './profile';
import { RANKINGS_SCREENS } from './rankings';
import { REPO_SCREENS } from './repo';
import { START_SCREENS } from './start';
import { WORKSPACE_PART_SCREENS } from './workspace-parts';

/** Every screen in the catalogue, by area, in the order of `AREAS`. */
export const SCREENS: Screen[] = [
  ...LANDING_SCREENS,
  ...PROFILE_SCREENS,
  ...REPO_SCREENS,
  ...PACKAGE_SCREENS,
  ...ORG_SCREENS,
  ...RANKINGS_SCREENS,
  ...BADGES_SCREENS,
  ...CONTRIBUTE_SCREENS,
  ...LEARN_SCREENS,
  ...START_SCREENS,
  ...WORKSPACE_PART_SCREENS,
  ...ADMIN_SCREENS,
];
