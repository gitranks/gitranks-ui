import 'server-only';

import { parse } from 'graphql';

import type { ProfilePick, ProfilePicksStats } from './profile-picks';
import type DocumentNode from '@/types/typed-document-node';

/** The block on the signed-in owner's own profile; null for anyone else. */
export const OwnProfilePicksDocument = parse(`query OwnProfilePicks($login: String!) {
  ownProfilePicks(login: $login) {
    contributor
    items { repo number url title labels language kind size why testCommand fit repoLanguage { name color } }
    stats { screenedRepos issuesRead readyIssues }
  }
}`) as DocumentNode<
  { ownProfilePicks: { contributor: boolean; items: ProfilePick[]; stats: ProfilePicksStats | null } | null },
  { login: string }
>;
