import { useQueryStates } from 'nuqs';
import { useLayoutEffect, useMemo, useState } from 'react';

import type { BadgeBuilderProfileProps } from '../components/login-form.types';
import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { isValidHex } from '@/badge/utils/is-valid-hex';
import type { NonNull } from '@/types/generic.types';
import type { UserRankProp } from '@/types/ranking.types';

type BadgeUrlResult = {
  url: string;
  /** Set when the chosen ranking is one the profile is not in: its badge would only show an error. */
  unrankedIn?: UserRankProp;
};

export const useBadgeUrl = ({ githubLogin, githubId, rankedIn }: BadgeBuilderProfileProps): BadgeUrlResult => {
  const [badgeParams] = useQueryStates(BadgeNuqsSchema);

  const values = useMemo(() => {
    const entries = Object.entries(badgeParams).filter(([k, v]) => {
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

  if (rankedIn && !rankedIn.includes(badgeParams.ranking)) {
    return { url: '', unrankedIn: badgeParams.ranking };
  }

  const queryParams = new URLSearchParams(values).toString();
  return { url: `${origin}/api/badge/v2/${githubLogin}${(queryParams ? '?' : '') + queryParams}` };
};
