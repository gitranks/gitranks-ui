'use client';

import { ReactNode } from 'react';
import { useMediaQuery } from 'usehooks-ts';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const AdaptiveTooltip = ({ trigger, children }: { children: ReactNode; trigger: ReactNode }) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent className="text-sm">{children}</TooltipContent>
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
