import { useQueryStates } from 'nuqs';
import { useLayoutEffect, useMemo, useState } from 'react';

import { BadgeNuqsSchema } from '@/badge/badge.nuqs';
import { isValidHex } from '@/badge/utils/is-valid-hex';
import { NonNull } from '@/types/generic.types';

export const useBadgeUrl = (githubLogin: string | undefined, githubId: string | undefined) => {
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
    return '';
  }

  const queryParams = new URLSearchParams(values).toString();
  return `${origin}/api/badge/v2/${githubLogin}` + (queryParams ? '?' : '') + queryParams;
};
