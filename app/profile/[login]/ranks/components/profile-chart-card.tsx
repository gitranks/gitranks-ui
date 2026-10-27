import type { FC, PropsWithChildren, ReactNode } from 'react';

import { Eyebrow, ProfileCard, ProfileCardContent } from '../../components/profile-card';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { cn } from '@/lib/utils';

type ProfileChartDataSlotProps = {
  title: string;
  value: ReactNode;
  tooltip: ReactNode;
  /** The value's colour: a tier's, where the value names one. */
  valueClassName?: string;
};

export const ProfileChartCard: FC<PropsWithChildren> = ({ children }) => (
  <ProfileCard className="p-0 overflow-hidden">
    <ProfileCardContent>
      <div className="flex">{children}</div>
    </ProfileCardContent>
  </ProfileCard>
);

export const ProfileChartSlot: FC<PropsWithChildren> = ({ children }) => {
  return children;
};

export const ProfileChartDataSlot: FC<ProfileChartDataSlotProps> = ({ title, value, tooltip, valueClassName }) => {
  return (
    <div className="flex flex-col justify-center items-center flex-grow m-4">
      <div className="flex flex-col gap-0.5">
        <Eyebrow>{title}</Eyebrow>
        <AdaptiveTooltip
          trigger={
            <button
              type="button"
              className={cn(
                'text-left text-2xl font-semibold tracking-tight underline decoration-dotted underline-offset-4',
                valueClassName,
              )}
            >
              {value}
            </button>
          }
        >
          {tooltip}
        </AdaptiveTooltip>
      </div>
    </div>
  );
};
