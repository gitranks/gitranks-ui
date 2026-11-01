import type { FC, ReactNode } from 'react';

import { OwnerTab } from './owner-tab';
import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';

/** A profile's header and tabs around the open tab's content, as its layout draws them. */
export const ProfileFrame: FC<{ login: string; children: ReactNode }> = ({ login, children }) => (
  <>
    <Header title={login} />
    <TabsBar className="mb-4">
      <Tab href={`/profile/${login}`} pathnames={[`/profile/${login}`, `/profile/${login}/country`]}>
        Overview
      </Tab>
      <Tab href={`/profile/${login}/ranks`}>Ranks</Tab>
      <Tab href={`/profile/${login}/repositories`}>Repositories</Tab>
      <Tab href={`/profile/${login}/languages`}>Languages</Tab>
      <OwnerTab login={login} href={`/profile/${login}/privacy`}>
        Privacy
      </OwnerTab>
    </TabsBar>
    {children}
  </>
);
