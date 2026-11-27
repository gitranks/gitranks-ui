import 'server-only';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeEmailSettingsDocument } from '@/lib/workspace/contribute.documents';

/**
 * The time zone the person saved, the one the API counts their days in: `{ timeZone: null }` when they saved none.
 * Null when it cannot be read (the read failed, or the API answers no settings for them): the page cannot know it.
 */
export async function loadBuildTimeZone(githubLogin: string): Promise<{ timeZone: string | null } | null> {
  try {
    const { contributeEmailSettings } = await graphqlDirect(
      ContributeEmailSettingsDocument,
      {},
      { source: 'ssr', githubLogin },
    );
    if (!contributeEmailSettings) return null;
    const { timeZone } = contributeEmailSettings;
    return { timeZone: typeof timeZone === 'string' && timeZone ? timeZone : null };
  } catch {
    return null;
  }
}
