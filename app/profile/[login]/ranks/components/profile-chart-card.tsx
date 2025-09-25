import type { FC, PropsWithChildren, ReactNode } from 'react';

import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';

import { ProfileCard, ProfileCardContent } from '../../components/profile-card';

type ProfileChartDataSlotProps = {
  title: string;
  value: string | number;
  tooltip: ReactNode;
};

export const ProfileChartCard: FC<PropsWithChildren> = ({ children }) => (
  <ProfileCard className="p-0 md:p-0">
    <ProfileCardContent>
      <div className="flex">{children}</div>
    </ProfileCardContent>
  </ProfileCard>
);

export const ProfileChartSlot: FC<PropsWithChildren> = ({ children }) => {
  return children;
};

export const ProfileChartDataSlot: FC<ProfileChartDataSlotProps> = ({ title, value, tooltip }) => {
  return (
    <div className="flex flex-col justify-center items-center flex-grow m-4">
      <div>
        <div className="text-lg">{title}</div>
        <AdaptiveTooltip
          trigger={<div className="text-2xl font-semibold underline decoration-dotted underline-offset-4">{value}</div>}
        >
          {tooltip}
        </AdaptiveTooltip>
      </div>
    </div>
  );
};
