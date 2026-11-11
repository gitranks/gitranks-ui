import 'server-only';

import { parse } from 'graphql';
import { cacheLife } from 'next/cache';

import type { ContributeLanguage } from './contribute.types';
import type { LanguagePicksAnswer, ProfilePick, ProfilePicksStats } from './profile-picks';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

const ITEM = 'repo number url title labels language kind size why testCommand';
const STATS = 'screenedRepos issuesRead readyIssues';

const LanguagePicksDocument = parse(`query ContributeLanguagePicks($language: ContributeLanguage!) {
  contributeLanguagePicks(language: $language) { items { ${ITEM} } stats { ${STATS} } }
}`) as DocumentNode<
  { contributeLanguagePicks: { items: ProfilePick[]; stats: ProfilePicksStats | null } | null },
  { language: ContributeLanguage }
>;

export const OwnProfilePicksDocument = parse(`query OwnProfilePicks($login: String!) {
  ownProfilePicks(login: $login) { contributor items { ${ITEM} fit } stats { ${STATS} } }
}`) as DocumentNode<
  { ownProfilePicks: { contributor: boolean; items: ProfilePick[]; stats: ProfilePicksStats | null } | null },
  { login: string }
>;

/**
 * A language's picks of the day, the same for every visitor: kept minutes on this server, so a profile view asks the
 * API nothing. Empty when Contribute is hidden or the read failed: the profile then shows no block.
 */
export async function loadLanguagePicks(language: ContributeLanguage): Promise<LanguagePicksAnswer> {
  'use cache';
  cacheLife('minutes');
  try {
    const { contributeLanguagePicks } = await graphqlDirect(LanguagePicksDocument, { language }, { source: 'ssr' });
    return { issues: contributeLanguagePicks?.items ?? [], stats: contributeLanguagePicks?.stats ?? null };
  } catch {
    return { issues: [], stats: null };
  }
}
