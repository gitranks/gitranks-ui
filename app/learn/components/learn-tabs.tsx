'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import {
  isLearnTablessPath,
  LEARN_ABOUT_PATH,
  LEARN_PATH,
  LEARN_PROFILE_PATH,
  MY_LESSONS_PATH,
} from '@/lib/learn/learn-path';

/**
 * Learn's tabs under the header: Learn home (with how Learn works and the page that starts a lesson), My lessons (an
 * attempt's page belongs to it), Goal and level. Not on the pages open to every visitor (a shared lesson, the page for
 * maintainers), nor on an attempt's page for a visitor, which show the header's line.
 */
export function LearnTabs() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  if (isLearnTablessPath(pathname)) return <HeaderLine />;
  const attempt = pathname.startsWith('/learn/attempts/');
  // An attempt's page is let through to a visitor (the sign-in): no tabs until a signed-in viewer is known.
  if (attempt && (status !== 'authenticated' || session?.error)) return <HeaderLine />;
  const home = pathname === LEARN_ABOUT_PATH || pathname.startsWith('/learn/start/');
  return (
    <TabsBar>
      <Tab href={LEARN_PATH} pathnames={home ? [pathname] : [LEARN_PATH]}>
        Learn home
      </Tab>
      <Tab href={MY_LESSONS_PATH} pathnames={attempt ? [pathname] : [MY_LESSONS_PATH]}>
        My lessons
      </Tab>
      <Tab href={LEARN_PROFILE_PATH}>Goal and level</Tab>
    </TabsBar>
  );
}
