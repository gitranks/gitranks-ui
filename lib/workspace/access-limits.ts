import type { ContributeLimits, ContributeSettings } from './contribute.types';

/** The settings fields the access level caps. */
export type CappedSetting = 'attemptsAtATime' | 'openPrsAtATime';

/**
 * The limits that cap the settings now: the reduced level's. Null at the standard level, while suspended (nothing new
 * starts, so no setting is worth capping), or while the API does not answer them.
 */
export const capsOf = (limits: ContributeLimits | null | undefined): ContributeLimits | null =>
  limits?.level === 'REDUCED' ? limits : null;

/** The open pull request limit set for the account, which holds over the setting and the level's cap; null with none. */
export const openPrsOverrideOf = (limits: ContributeLimits | null | undefined): number | null =>
  typeof limits?.openPrsOverride === 'number' ? limits.openPrsOverride : null;

/**
 * What holds of a setting now: the setting, or the level's cap when that is lower. The setting itself is kept. The open
 * pull request limit is the API's `openPrsEffective` when it answers one (it carries a limit set for the account).
 */
export const effectiveSettingOf = (
  settings: Pick<ContributeSettings, CappedSetting>,
  limits: ContributeLimits | null | undefined,
  field: CappedSetting,
): number => {
  if (field === 'openPrsAtATime' && typeof limits?.openPrsEffective === 'number') return limits.openPrsEffective;
  const caps = capsOf(limits);
  return caps ? Math.min(settings[field], caps[field]) : settings[field];
};

/** Why the cap holds, as the settings say it: while the account is new, or for now. */
const isNewAccount = (limits: ContributeLimits) => limits.reason === 'NEW_ACCOUNT';

/**
 * The field's hint under a cap: "Up to 1 while your account is new", "Up to 2 for now". Null with no cap, and for the
 * open pull request limit while one is set for the account (the setting does not hold then).
 */
export function capHintOf(
  limits: ContributeLimits | null | undefined,
  field: CappedSetting,
): { max: number; text: string } | null {
  const caps = capsOf(limits);
  if (!caps || (field === 'openPrsAtATime' && openPrsOverrideOf(limits) !== null)) return null;
  return { max: caps[field], text: isNewAccount(caps) ? 'while your account is new' : 'for now' };
}

/**
 * The budget line's note when the attempts at a time that hold are below the setting: "1 at a time (new-account
 * limit)", "1 at a time (limit for now)". Null otherwise.
 */
export function attemptsCapNoteOf(
  settings: Pick<ContributeSettings, 'attemptsAtATime'>,
  limits: ContributeLimits | null | undefined,
): string | null {
  const caps = capsOf(limits);
  if (!caps || caps.attemptsAtATime >= settings.attemptsAtATime) return null;
  return `${caps.attemptsAtATime} at a time (${isNewAccount(caps) ? 'new-account limit' : 'limit for now'})`;
}

/**
 * A value typed above the cap, refused with what the cap is: "Attempts at a time: up to 1 while your account is new."
 * A value as stored is kept even above it: the stored setting comes back when the limit lifts. Null when it passes.
 */
export function capRefusalOf(
  limits: ContributeLimits | null | undefined,
  field: CappedSetting,
  label: string,
  value: number,
  stored: number,
): string | null {
  const hint = capHintOf(limits, field);
  if (!hint || value <= hint.max || value === stored) return null;
  return `${label}: up to ${hint.max} ${hint.text}.`;
}
