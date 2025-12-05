'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';

import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';

type AdaptiveTooltipProps = {
  trigger: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export const AdaptiveTooltip = ({ trigger, children, contentClassName }: AdaptiveTooltipProps) => {
  const [mounted, setMounted] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render Popover on server and initial client render to avoid hydration mismatch
  if (!mounted || !isDesktop) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="text-sm w-auto">{children}</PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent className={cn('text-sm', contentClassName)}>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
