import { useQueryStates } from 'nuqs';
import { useLayoutEffect, useState } from 'react';

import { BadgeNuqsSchema } from '@/badge/badge.nuqs';

export const useBadgeUrl = (githubLogin: string | undefined, githubId: string | undefined) => {
  const [badgeParams] = useQueryStates(BadgeNuqsSchema);
  const [origin, setOrigin] = useState<string>('');

  useLayoutEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!githubId) {
    return '';
  }

  const queryParams = new URLSearchParams(badgeParams).toString();
  return `${origin}/api/badge/${githubLogin}` + (queryParams ? '?' : '') + queryParams;
};
