import type { RankedIn } from '@/badge/utils/is-ranked-in';

export type LoginFormProps = {
  githubLogin?: string;
  githubId?: string;
};

export type BadgeBuilderProfileProps = LoginFormProps & {
  /** Rankings the chosen profile is in, per context; unset until a profile is chosen. */
  rankedIn?: RankedIn;
  /** The chosen profile's country, detected from its location; a country badge needs one. */
  country?: string | null;
};
