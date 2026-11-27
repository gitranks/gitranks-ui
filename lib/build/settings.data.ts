import 'server-only';

import { type BuildActionResult, buildErrorOf, invalidBuildAction } from './build-action';
import { BuildSettingsDocument, SaveBuildSettingsDocument } from './settings.documents';
import type { BuildSettings } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The signed-in person's Build settings: null when they have no build yet, when Build is not open to them, and on any
 * failure (Settings then shows no row). Never kept.
 */
export async function loadBuildSettings(githubLogin: string): Promise<BuildSettings | null> {
  try {
    const { buildSettings } = await graphqlDirect(BuildSettingsDocument, undefined, { source: 'ssr', githubLogin });
    return buildSettings ?? null;
  } catch {
    return null;
  }
}

/** Saves the person's reminders (`{ reminders }`), as the session's person: the settings as saved. */
export async function saveBuildSettings(
  githubLogin: string,
  body: Record<string, unknown>,
): Promise<BuildActionResult<BuildSettings>> {
  if (typeof body.reminders !== 'boolean') return invalidBuildAction();
  try {
    const { saveBuildSettings: saved } = await graphqlDirect(
      SaveBuildSettingsDocument,
      { input: { reminders: body.reminders } },
      { source: 'client', githubLogin },
    );
    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: buildErrorOf(error) };
  }
}
