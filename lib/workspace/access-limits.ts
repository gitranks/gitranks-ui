import type { ContributeLimits, ContributeSettings } from './contribute.types';

/** The settings fields whose limit the API may answer apart from the setting. */
export type CappedSetting = 'attemptsAtATime' | 'openPrsAtATime';

/** The open pull request limit set for the account, which holds over the setting; null with none. */
export const openPrsOverrideOf = (limits: ContributeLimits | null | undefined): number | null =>
  typeof limits?.openPrsOverride === 'number' ? limits.openPrsOverride : null;

/**
 * What holds of a setting now: the setting itself, or for the open pull request limit the API's `openPrsEffective` when
 * it answers one (it carries a limit set for the account).
 */
export const effectiveSettingOf = (
  settings: Pick<ContributeSettings, CappedSetting>,
  limits: ContributeLimits | null | undefined,
  field: CappedSetting,
): number =>
  field === 'openPrsAtATime' && typeof limits?.openPrsEffective === 'number'
    ? limits.openPrsEffective
    : settings[field];
