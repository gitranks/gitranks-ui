import type { Screen } from '../registry';
import { BADGES_SCREENS } from './badges';
import { CONTRIBUTE_SCREENS } from './contribute';
import { LANDING_SCREENS } from './landing';
import { ORG_SCREENS } from './org';
import { PROFILE_SCREENS } from './profile';
import { RANKINGS_SCREENS } from './rankings';
import { REPO_SCREENS } from './repo';

/** Every screen in the catalogue, by area, in the order of `AREAS`. */
export const SCREENS: Screen[] = [
  ...LANDING_SCREENS,
  ...PROFILE_SCREENS,
  ...REPO_SCREENS,
  ...ORG_SCREENS,
  ...RANKINGS_SCREENS,
  ...BADGES_SCREENS,
  ...CONTRIBUTE_SCREENS,
];
