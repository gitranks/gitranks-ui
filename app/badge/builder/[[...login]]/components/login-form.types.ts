import type { UserRankProp } from '@/types/ranking.types';

export type LoginFormProps = {
  githubLogin?: string;
  githubId?: string;
};

export type BadgeBuilderProfileProps = LoginFormProps & {
  /** Rankings the chosen profile is in; unset until a profile is chosen. */
  rankedIn?: UserRankProp[];
};
