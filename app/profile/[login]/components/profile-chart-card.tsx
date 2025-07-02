import { FC, PropsWithChildren } from 'react';

import { ProfileCard, ProfileCardContent } from './profile-card';

type ProfileChartDataSlotProps = {
  title: string;
  value: string | number;
  onClick?: () => void;
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

export const ProfileChartDataSlot: FC<ProfileChartDataSlotProps> = ({ title, value, onClick }) => {
  return (
    <div className="flex flex-col justify-center items-center flex-grow m-4">
      <div>
        <div className="text-lg">{title}</div>
        <div className="text-2xl font-semibold" onClick={onClick}>
          {value}
        </div>
      </div>
    </div>
  );
};
