import type { ContributeSetupState } from './contribute.types';

const STATES: Record<string, ContributeSetupState> = {
  NONE: 'none',
  SETTING_UP: 'setting-up',
  FAILED: 'failed',
  REMOVED: 'removed',
  MANAGED_ACCOUNT: 'managed',
};

/** The API's answer as a setup state; null for anything else. */
export const setupStateOf = (value: unknown): ContributeSetupState | null =>
  typeof value === 'string' && Object.hasOwn(STATES, value) ? STATES[value] : null;
