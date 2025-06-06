import { FC } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCard } from '@/components/user-card/user-card';
import { formatNumberShort } from '@/utils/format-number-short';

type CountryCardStatProps = {
  emoji: string;
  value: number;
  label: string;
  topUser?: {
    login?: string | null;
    avatarUrl?: string | null;
  } | null;
  topUserLabel?: string;
  tooltip: string;
};

export const CountryCardStat: FC<CountryCardStatProps> = ({ emoji, value, label, topUser, topUserLabel, tooltip }) => {
  return (
    <div className="flex flex-col gap-6 items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1 items-center">
            <span className="font-semibold">
              {emoji} {formatNumberShort(value)}
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>

      {topUser?.login && (
        <div className="flex flex-col gap-1 text-xs items-center">
          <span>{topUserLabel}</span>
          <div className="font-semibold">
            <UserCard login={topUser?.login} avatarUrl={topUser?.avatarUrl} avatarClassName="size-5" />
          </div>
        </div>
      )}
    </div>
  );
};
