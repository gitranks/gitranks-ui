import { ProfileSummaryQuery, RankTiersByNameQuery, Tier } from '@/types/generated/graphql';
import { UserRankProps } from '@/types/ranking.types';

export type RankGlobalType =
  | NonNullable<ProfileSummaryQuery['user']>['rankGlobal']
  | NonNullable<ProfileSummaryQuery['user']>['rankCountry'];
export type TiersDataType = RankTiersByNameQuery['rankTiersByName'];

export type ProfileTierType = {
  data?: Tier;
  isProvisional?: boolean; // true if this tier is provisional
  dataM?: Tier; // the M tier, if available
  rankedCount: number; // number of users in this tier, if available
  notAvailable?: boolean; // true if the tier is not available
  notRanked?: boolean; // true if the user is not ranked in this tier
  key?: UserRankProps; // the key of the tier, e.g. 's', 'c', 'f'
};

export type ProfileTierWithData = Omit<ProfileTierType, 'data' | 'key' | 'notAvailable' | 'notRanked'> & {
  data: Tier;
  key: UserRankProps;
  notAvailable?: false;
  notRanked?: false;
};

export type BestTierResult = {
  data: Tier; // the best {tier, level} itself
  source: UserRankProps[]; // which bucket(s) it came from
  isProvisional: boolean; // true if every winning bucket was provisional
};
