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

/**
 * A pointer that can hover, such as a mouse or a trackpad: those get the tooltip. Touch screens of any width (phones and
 * tablets) get the popover, which opens on a tap.
 */
export const HOVER_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export const AdaptiveTooltip = ({ trigger, children, contentClassName }: AdaptiveTooltipProps) => {
  const [mounted, setMounted] = useState(false);
  const canHover = useMediaQuery(HOVER_POINTER_QUERY);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always render Popover on server and initial client render to avoid hydration mismatch
  if (!mounted || !canHover) {
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
