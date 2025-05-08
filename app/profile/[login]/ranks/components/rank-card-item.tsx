import { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type RankCardItemProps = {
  Icon?: FC<{ size: number; className?: string }>;
  children: ReactNode;
  className?: string;
};

export const RankCardItem: FC<RankCardItemProps> = ({ Icon, children, className }) => {
  return (
    <div className={cn('flex flex-row items-center gap-2', className)}>
      {!!Icon && <Icon size={20} className="shrink-0" />}
      {children}
    </div>
  );
};
