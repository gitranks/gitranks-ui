import 'server-only';

import { type LearnEmailSettings, learnEmailSettingsOf } from './settings';
import { LearnEmailSettingsDocument } from './settings.documents';
import type { LearnSetupRead } from './setup';
import { setupReadOf } from './setup';
import { LearnSetupOfMineDocument } from './setup.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * Learn's rows of Settings, read for the signed-in person alone on each request and never kept: Settings is their own
 * page, rendered for them. Each read tells "not open to them" (null) from a failure (undefined), so a row can say it
 * did not load.
 */

/** Learn's email settings: null when Learn is not open to the person, undefined on a failure or an answer out of shape. */
export async function loadLearnEmailSettings(githubLogin: string): Promise<LearnEmailSettings | null | undefined> {
  try {
    const { learnEmailSettings } = await graphqlDirect(LearnEmailSettingsDocument, {}, { source: 'ssr', githubLogin });
    if (learnEmailSettings === null) return null;
    return learnEmailSettingsOf(learnEmailSettings) ?? undefined;
  } catch {
    return undefined;
  }
}

/** The person's setup, for its row: null when Learn is not open to them, undefined on a failure. */
export async function loadLearnSetupForSettings(githubLogin: string): Promise<LearnSetupRead | null | undefined> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(LearnSetupOfMineDocument, {}, { source: 'ssr', githubLogin });
    if (learnSetupOfMine === null) return null;
    return setupReadOf(learnSetupOfMine) ?? undefined;
  } catch {
    return undefined;
  }
}
