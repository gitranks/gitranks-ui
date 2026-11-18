import { parse } from 'graphql';

import type { HeroActionResult, HeroBoard, HeroLiveCheckResult, HeroScheduleInput } from './admin.types';
import type DocumentNode from '@/types/typed-document-node';

/**
 * The board's operations, written out here rather than in `.gql` files, as the follow pages' are: the fields are newer
 * than the generated schema, and an API that does not answer them yet fails only these operations.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const MAIL = 'queuedAt sentAt held markedBy noReceipt';
const MISS = 'code label blocks';
const PACKAGE = 'registry name';

const SLOT = `
  id week startsAt endsAt status preview
  repo { githubId nameWithOwner description createdAt }
  package { ${PACKAGE} }
  maintainer { githubId login name hasEmail }
  line reason text
  facts { weeklyDownloads dependents contributors }
  headsUp { ${MAIL} }
  recap { ${MAIL} }
  starsAtStart starsNow starsGained visits githubClicks
  scheduledBy scheduledAt optedOutAt cancelledReason
`;

const LIVE_CHECK = `
  at outcome package { ${PACKAGE} } nameWithOwner githubStars isFork isArchived licenseSpdx pushedAt
  ownerLogin ownerType ownerFollowers firstName hasEmail advisories advisoriesIncomplete
  lookupAnswered linked weeklyDownloads dependents optedOut
  misses { ${MISS} }
  refusals
`;

const WEEK = 'week startsAt endsAt closesAt';

const ACTION = `ok refusal slot { ${SLOT} }`;

export const UnsungHeroAdminDocument = doc<{ unsungHeroAdmin: HeroBoard | null }>(
  `query UnsungHeroAdmin {
    unsungHeroAdmin {
      preview
      live { ${SLOT} }
      upcoming { ${SLOT} }
      nextWeek { ${WEEK} }
      firstOpenWeek { ${WEEK} }
      shortlist {
        position
        repo { githubId nameWithOwner createdAt }
        package { ${PACKAGE} }
        weeklyDownloads downloadsRank dependents stars pushedAt
        owner { githubId login type followers hasEmail }
        score
        misses { ${MISS} }
        liveCheck { ${LIVE_CHECK} }
      }
      shortlistBuiltAt
      past { ${SLOT} }
      optOuts { maintainerGithubId login at }
    }
  }`,
);

export const UnsungHeroSkipDocument = doc<{ unsungHeroSkip: HeroActionResult | null }, { repoGithubId: string }>(
  `mutation UnsungHeroSkip($repoGithubId: String!) {
    unsungHeroSkip(repoGithubId: $repoGithubId) { ${ACTION} }
  }`,
);

export const UnsungHeroLiveCheckDocument = doc<
  { unsungHeroLiveCheck: HeroLiveCheckResult | null },
  { repoGithubId: string; packageName: string | null }
>(
  `mutation UnsungHeroLiveCheck($repoGithubId: String!, $packageName: String) {
    unsungHeroLiveCheck(repoGithubId: $repoGithubId, packageName: $packageName) {
      refusal
      check { ${LIVE_CHECK} }
    }
  }`,
);

export const UnsungHeroScheduleDocument = doc<
  { unsungHeroSchedule: HeroActionResult | null },
  { input: HeroScheduleInput }
>(
  `mutation UnsungHeroSchedule($input: UnsungHeroScheduleInput!) {
    unsungHeroSchedule(input: $input) { ${ACTION} }
  }`,
);

export const UnsungHeroCancelDocument = doc<{ unsungHeroCancel: HeroActionResult | null }, { id: string }>(
  `mutation UnsungHeroCancel($id: ID!) {
    unsungHeroCancel(id: $id) { ${ACTION} }
  }`,
);

export const UnsungHeroMarkNotifiedDocument = doc<{ unsungHeroMarkNotified: HeroActionResult | null }, { id: string }>(
  `mutation UnsungHeroMarkNotified($id: ID!) {
    unsungHeroMarkNotified(id: $id) { ${ACTION} }
  }`,
);
