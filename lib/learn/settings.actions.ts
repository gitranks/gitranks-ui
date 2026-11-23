'use server';

import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
import { type LearnEmailSettings, learnEmailSettingsInputOf, learnEmailSettingsOf } from './settings';
import { SaveLearnEmailSettingsDocument } from './settings.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/**
 * Saves Learn's email settings as the session's user, never one named in the arguments: "Lessons to repeat" on or off,
 * a zone the person chose, or the zone handed back to their device. Only the fields sent change, so turning the
 * switch never moves the zone. Anything not of that shape is refused before the API is asked. Null data when Learn is
 * not open to the person.
 */
export async function saveLearnEmailSettingsAction(
  input: unknown,
): Promise<LearnActionResult<LearnEmailSettings | null>> {
  const settings = learnEmailSettingsInputOf(input);
  if (!settings) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(SaveLearnEmailSettingsDocument, { settings }, { source: 'client', githubLogin });
    if (data.saveLearnEmailSettings === null) return { ok: true, data: null };
    const saved = learnEmailSettingsOf(data.saveLearnEmailSettings);
    return saved ? { ok: true, data: saved } : { ok: false, error: 'FAILED' };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}
