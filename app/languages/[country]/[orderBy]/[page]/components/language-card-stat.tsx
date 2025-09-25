import type { FC, ReactNode } from 'react';

import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';

type LanguageCardStatProps = {
  value: string | ReactNode;
  label: string;
  tooltip?: string;
};

export const LanguageCardStat: FC<LanguageCardStatProps> = ({ value, label, tooltip }) => {
  const getStat = () => (
    <div className="flex flex-col gap-1 items-center px-1">
      <div className="font-semibold whitespace-nowrap max-w-full overflow-hidden grow flex items-center gap-0.5">
        {value}
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );

  if (!tooltip) {
    return getStat();
  }

  return (
    <AdaptiveTooltip trigger={getStat()} contentClassName="max-w-82">
      {tooltip}
    </AdaptiveTooltip>
  );
};
