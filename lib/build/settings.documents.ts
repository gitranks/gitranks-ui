import { doc } from './build.documents';
import type { BuildSettings } from './types';

/* Build's row in Settings: the person's reminders, read and saved. */

/** The person's Build settings; null when they have no build yet, or Build is not open to them. */
export const BuildSettingsDocument = doc<{ buildSettings: BuildSettings | null }>(
  'query BuildSettings { buildSettings { reminders } }',
);

/** Turns Build's reminders on or off; answers the settings as saved. */
export const SaveBuildSettingsDocument = doc<{ saveBuildSettings: BuildSettings }, { input: BuildSettings }>(
  'mutation SaveBuildSettings($input: BuildSettingsInput!) { saveBuildSettings(input: $input) { reminders } }',
);
