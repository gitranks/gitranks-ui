import 'server-only';

import { parse } from 'graphql';

import type { ProfilePick, ProfilePicksStats } from './profile-picks';
import { MASKED_PART } from '@/lib/workspace/masked-issue.fields';
import type DocumentNode from '@/types/typed-document-node';

const PICK = 'repo number url title labels language kind size why testCommand fit repoLanguage { name color }';

type OwnProfilePicks = {
  ownProfilePicks: { contributor: boolean; items: ProfilePick[]; stats: ProfilePicksStats | null } | null;
};

/** The block on the signed-in owner's own profile; null for anyone else. */
export const OwnProfilePicksDocument = parse(`query OwnProfilePicks($login: String!) {
  ownProfilePicks(login: $login) {
    contributor
    items { ${PICK} }
    stats { screenedRepos issuesRead readyIssues }
  }
}`) as DocumentNode<OwnProfilePicks, { login: string }>;

/** The same block with each issue's masked form: an API without it answers `OwnProfilePicksDocument` instead. */
export const OwnProfilePicksMaskedDocument = parse(`query OwnProfilePicksMasked($login: String!) {
  ownProfilePicks(login: $login) {
    contributor
    items { ${PICK} ${MASKED_PART} }
    stats { screenedRepos issuesRead readyIssues }
  }
}`) as DocumentNode<OwnProfilePicks, { login: string }>;
