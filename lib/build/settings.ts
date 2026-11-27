import type { BuildActionError } from './build-action';
import type { BuildSettings } from './types';

/*
 * Build's row in Settings, "Build reminders": one switch for Build's two emails, which come with a person's first
 * build, turned on. The row is there only for a person with a build.
 */

export const BUILD_REMINDERS_TITLE = 'Build reminders';
export const BUILD_REMINDERS_LINE =
  'Two emails at most for a project: when its gold test opens, and once if a build stands still for 3 days.';

/** The settings as the API answers them; null for anything else. */
export function buildSettingsOf(value: unknown): BuildSettings | null {
  if (!value || typeof value !== 'object') return null;
  const { reminders } = value as Record<string, unknown>;
  return typeof reminders === 'boolean' ? { reminders } : null;
}

/** Why a change of the switch did not save, in a sentence under the row. */
export function buildSettingsErrorOf(error: BuildActionError): string {
  if (error === 'SIGNED_OUT') return 'Your session ended. Sign in again, then change it.';
  return 'We could not save just now. Try again in a minute.';
}
