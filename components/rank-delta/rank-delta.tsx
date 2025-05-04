import { FC } from 'react';

import { cn } from '@/lib/utils';

type RankDeltaProps = {
  current?: number | null;
  previous?: number | null;
};

export const RankDelta: FC<RankDeltaProps> = ({ current, previous }) => {
  if (!previous || !current) {
    return null;
  }

  const difference = previous - current;

  if (difference === 0) {
    return null;
  }

  const isPositive = difference > 0;

  return (
    <span className={cn('text-xs', { 'text-positive': isPositive, 'text-negative': !isPositive })}>{`${
      isPositive ? '+' : ''
    }${difference?.toLocaleString('en-US')}`}</span>
  );
};
