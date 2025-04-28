import { useQueryStates } from 'nuqs';

import { BadgeNuqsSchema } from '@/badge/badge.nuqs';

export const useBadgeUrl = (githubLogin: string | undefined, githubId: string | undefined) => {
  const [badgeParams] = useQueryStates(BadgeNuqsSchema);

  if (!githubId) {
    return '';
  }

  const queryParams = new URLSearchParams(badgeParams).toString();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/badge/${githubLogin}` + (queryParams ? '?' : '') + queryParams;
};
