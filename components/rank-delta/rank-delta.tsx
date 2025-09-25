import type { FC } from 'react';

import { cn } from '@/lib/utils';

type RankDeltaProps = {
  current?: number | null;
  previous?: number | null;
  className?: string;
};

export const RankDelta: FC<RankDeltaProps> = ({ current, previous, className }) => {
  if (!previous || !current) {
    return null;
  }

  const difference = previous - current;

  if (difference === 0) {
    return null;
  }

  const isPositive = difference > 0;

  return (
    <span className={cn('text-xs', className, { 'text-positive': isPositive, 'text-negative': !isPositive })}>{`${
      isPositive ? '↑' : '↓'
    }${Math.abs(difference).toLocaleString('en-US')}`}</span>
  );
};
