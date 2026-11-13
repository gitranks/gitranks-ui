'use client';

import { usePathname } from 'next/navigation';

import { HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { isLearnTablessPath, LEARN_PATH, LEARN_PROFILE_PATH, MY_LESSONS_PATH } from '@/lib/learn/learn-path';

/**
 * Learn's tabs under the header: My lessons (an attempt's page belongs to it), Goal and level, How Learn works. Not on
 * the pages open to every visitor (a shared lesson, the page for maintainers), which show the header's line.
 */
export function LearnTabs() {
  const pathname = usePathname();
  if (isLearnTablessPath(pathname)) return <HeaderLine />;
  const attempt = pathname.startsWith('/learn/attempts/');
  return (
    <TabsBar>
      <Tab href={MY_LESSONS_PATH} pathnames={attempt ? [pathname] : [MY_LESSONS_PATH]}>
        My lessons
      </Tab>
      <Tab href={LEARN_PROFILE_PATH}>Goal and level</Tab>
      <Tab href={LEARN_PATH} exact>
        How Learn works
      </Tab>
    </TabsBar>
  );
}
