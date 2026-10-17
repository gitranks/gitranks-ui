import { useQueryStates } from 'nuqs';
import { useLayoutEffect, useMemo, useState } from 'react';

import type { BadgeBuilderProfileProps } from '../components/login-form.types';
import { getDefaultLabel } from '../utils/get-default-label';
import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { isValidHex } from '@/badge/utils/is-valid-hex';
import { BadgeContext } from '@/types/badge.types';
import type { NonNull } from '@/types/generic.types';
import type { UserRankProp } from '@/types/ranking.types';

type BadgeUrlResult = {
  url: string;
  /** The profile tab the embedded badge links to, global or country like the badge; set together with `url`. */
  profileUrl?: string;
  /** Set when the profile is not in the chosen ranking in the chosen context: its badge would only show an error. */
  unranked?: { ranking: UserRankProp; context: BadgeContext };
};

export const useBadgeUrl = ({ githubLogin, githubId, rankedIn }: BadgeBuilderProfileProps): BadgeUrlResult => {
  const [badgeParams] = useQueryStates(BadgeNuqsSchema);

  const values = useMemo(() => {
    const label = badgeParams.label ?? getDefaultLabel(badgeParams.ranking, badgeParams.type);
    const entries = Object.entries({ ...badgeParams, label }).filter(([k, v]) => {
      if (['labelBgColor', 'valueBgColor'].includes(k)) {
        return isValidHex(v);
      }
      return !!v;
    });
    return Object.fromEntries(entries) as NonNull<typeof badgeParams>;
  }, [badgeParams]);

  const [origin, setOrigin] = useState<string>('');

  useLayoutEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!githubId) {
    return { url: '' };
  }

  const { ranking, context } = badgeParams;
  if (rankedIn && !rankedIn[context].includes(ranking)) {
    return { url: '', unranked: { ranking, context } };
  }

  const queryParams = new URLSearchParams(values).toString();
  return {
    url: `${origin}/api/badge/v2/${githubLogin}${(queryParams ? '?' : '') + queryParams}`,
    profileUrl: `${origin}/profile/${githubLogin}${context === BadgeContext.Country ? '/country' : ''}`,
  };
};
