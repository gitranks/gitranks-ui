'use client';
import { FC } from 'react';

import { cn } from '@/lib/utils';

import { RankDelta } from '../rank-delta/rank-delta';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type RankNumberProps = {
  rank?: number | null;
  rankProvisional?: number | null;
  rankPrevious?: number | null;
  showDelta?: boolean;
  className?: string;
};

export const RankNumber: FC<RankNumberProps> = ({ rank, rankPrevious, rankProvisional, showDelta, className }) => {
  if (!rankProvisional || rankProvisional === rank) {
    return (
      <>
        {rank?.toLocaleString('en-US')}
        {showDelta !== false && (
          <>
            &nbsp;
            <RankDelta current={rank} previous={rankPrevious} />
          </>
        )}
      </>
    );
  }

  return (
    <span className={cn('flex gap-2 items-center', className)}>
      {rankProvisional?.toLocaleString('en-US')}{' '}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="px-1">
              provisional
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-44">
              Temporary estimate based on other users’ current ranks. A precise ranking replaces it after the next daily
              calculation.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
};
