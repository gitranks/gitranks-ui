import type { Tier } from '@/types/generated/graphql';
import type { UserRankProp } from '@/types/ranking.types';

export type RanksType =
  | {
      s?: number | null;
      sProvisional?: number | null;
      sM?: number | null;
      c?: number | null;
      cProvisional?: number | null;
      cM?: number | null;
      f?: number | null;
      fProvisional?: number | null;
      fM?: number | null;
    }
  | null
  | undefined;

export type ProfileTierType = {
  data?: Tier;
  isProvisional?: boolean; // true if this tier is provisional
  dataM?: Tier; // the M tier, if available
  rankedCount: number; // number of users in this tier, if available
  notAvailable?: boolean; // true if the tier is not available
  notRanked?: boolean; // true if the user is not ranked in this tier
  key?: UserRankProp; // the key of the tier, e.g. 's', 'c', 'f'
};

export type ProfileTierWithData = Omit<ProfileTierType, 'data' | 'key' | 'notAvailable' | 'notRanked'> & {
  data: Tier;
  key: UserRankProp;
  notAvailable?: false;
  notRanked?: false;
};

export type BestTierResult = {
  data: Tier; // the best {tier, level} itself
  source: UserRankProp[]; // which bucket(s) it came from
  isProvisional: boolean; // true if every winning bucket was provisional
};
