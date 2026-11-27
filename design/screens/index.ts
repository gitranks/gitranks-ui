import type { Screen } from '../registry';
import { ADMIN_SCREENS } from './admin';
import { BADGES_SCREENS } from './badges';
import { BUILD_DOORS_SCREENS } from './build-doors';
import { BUILD_HOME_SCREENS } from './build-home';
import { BUILD_MINE_SCREENS } from './build-mine';
import { BUILD_PROJECT_SCREENS } from './build-project';
import { BUILD_SITE_SCREENS } from './build-site';
import { BUILD_SKILLS_SCREENS } from './build-skills';
import { BUILD_START_SCREENS } from './build-start';
import { BUILD_STEP_SCREENS } from './build-step';
import { BUILD_TEST_SCREENS } from './build-test';
import { CONTRIBUTE_SCREENS } from './contribute';
import { HELD_BACK_SCREENS } from './held-back';
import { LANDING_SCREENS } from './landing';
import { LEARN_SCREENS } from './learn';
import { LEARN_FRAME_SCREENS } from './learn-frame';
import { LEARN_REAL_PROJECTS_SCREENS } from './learn-real-projects';
import { ORG_SCREENS } from './org';
import { PACKAGE_SCREENS } from './package';
import { PROFILE_SCREENS } from './profile';
import { RANKINGS_SCREENS } from './rankings';
import { REPO_SCREENS } from './repo';
import { START_SCREENS } from './start';
import { UNSUNG_HERO_APPLY_SCREENS } from './unsung-hero-apply';
import { WORKSPACE_SCREENS } from './workspace';
import { WORKSPACE_BAR_DOOR_SCREENS } from './workspace-bar-door';
import { WORKSPACE_PART_SCREENS } from './workspace-parts';

/** Every screen in the catalogue, by area, in the order of `AREAS`. */
export const SCREENS: Screen[] = [
  ...LANDING_SCREENS,
  ...UNSUNG_HERO_APPLY_SCREENS,
  ...PROFILE_SCREENS,
  ...REPO_SCREENS,
  ...PACKAGE_SCREENS,
  ...ORG_SCREENS,
  ...RANKINGS_SCREENS,
  ...BADGES_SCREENS,
  ...CONTRIBUTE_SCREENS,
  ...WORKSPACE_SCREENS,
  ...WORKSPACE_BAR_DOOR_SCREENS,
  ...START_SCREENS,
  ...WORKSPACE_PART_SCREENS,
  ...HELD_BACK_SCREENS,
  ...LEARN_SCREENS,
  ...LEARN_REAL_PROJECTS_SCREENS,
  ...LEARN_FRAME_SCREENS,
  ...BUILD_HOME_SCREENS,
  ...BUILD_MINE_SCREENS,
  ...BUILD_PROJECT_SCREENS,
  ...BUILD_STEP_SCREENS,
  ...BUILD_START_SCREENS,
  ...BUILD_TEST_SCREENS,
  ...BUILD_SITE_SCREENS,
  ...BUILD_SKILLS_SCREENS,
  ...BUILD_DOORS_SCREENS,
  ...ADMIN_SCREENS,
];
