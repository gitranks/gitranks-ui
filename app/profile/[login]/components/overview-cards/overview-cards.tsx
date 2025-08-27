import { FC, ReactNode } from 'react';

import { ProfileCardsGrid } from '../profile-card';

type OverviewCardsContainerProps = {
  children: ReactNode;
};

export const OverviewCardsContainer: FC<OverviewCardsContainerProps> = ({ children }) => {
  return <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">{children}</ProfileCardsGrid>;
};
