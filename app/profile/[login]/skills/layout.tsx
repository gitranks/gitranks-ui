import { cacheLife, cacheTag } from 'next/cache';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { SkillsLoginColumn } from '../components/skills-missing-screen';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';
import { loginFromPath } from '@/utils/login-from-path';
import { profileCacheTag } from '@/utils/profile-refresh';

/**
 * The profile's left column around the Skills tab, public or not: a not-found page gets no params, so the column is
 * drawn here, around the page and its "not found" alike. A hidden page's owner sees the column every other tab shows,
 * and hiding or showing the page changes the tab's content alone. It holds only the public profile, the same for
 * everyone, kept under the person's tag; a login with no profile here keeps its avatar and login.
 */
export default async function SkillsLayout({ children, params }: LayoutProps<'/profile/[login]/skills'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(profileCacheTag(login));

  const user = await fetchProfilePageOverview(login);
  if (!user) return <SkillsLoginColumn login={loginFromPath(login)}>{children}</SkillsLoginColumn>;
  return <LayoutLeftColumn user={user}>{children}</LayoutLeftColumn>;
}
