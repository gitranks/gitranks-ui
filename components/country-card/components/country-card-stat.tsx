import { ElementType, FC } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCard } from '@/components/user-card/user-card';
import { formatNumberShort } from '@/utils/format-number-short';

type CountryCardStatProps = {
  Icon: ElementType;
  value: number;
  label: string;
  topUser?: {
    login?: string | null;
    avatarUrl?: string | null;
  } | null;
  topUserLabel?: string;
  tooltip: string;
};

export const CountryCardStat: FC<CountryCardStatProps> = ({ Icon, value, label, topUser, topUserLabel, tooltip }) => {
  return (
    <div className="flex flex-col gap-5 items-center px-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-1 items-center">
            <span className="font-semibold flex gap-0.5 items-center">
              <Icon /> {formatNumberShort(value)}
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>

      {topUser?.login && (
        <div className="flex flex-col gap-1 text-xs items-center max-w-full overflow-hidden">
          <span>{topUserLabel}</span>
          <div className="font-semibold max-w-full">
            <UserCard login={topUser?.login} avatarUrl={topUser?.avatarUrl} size={20} />
          </div>
        </div>
      )}
    </div>
  );
};
