'use client';

import type { ReactNode } from 'react';
import { useMediaQuery } from 'usehooks-ts';

import { cn } from '@/lib/utils';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type AdaptiveTooltipProps = {
  trigger: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export const AdaptiveTooltip = ({ trigger, children, contentClassName }: AdaptiveTooltipProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent className={cn('text-sm', contentClassName)}>{children}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="text-sm w-auto">{children}</PopoverContent>
    </Popover>
  );
};
