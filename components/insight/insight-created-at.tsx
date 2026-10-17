'use client';

import { formatDistance } from 'date-fns';
import { useEffect, useState } from 'react';

import { formatPostDateTime, formatPostDay } from './format-insight-date';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DAY_MS = 24 * 60 * 60 * 1000;

type InsightCreatedAtProps = {
  createdAt: Date;
};

/**
 * The post date in UTC, as rendered on the server. After mount, posts from the last day switch to
 * "3 hours ago". The current time is read in an effect: reading it during render would make Next
 * render the surrounding page in the browser.
 */
export const InsightCreatedAt = ({ createdAt }: InsightCreatedAtProps) => {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const isRecent = now !== null && now - createdAt.getTime() < DAY_MS;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={createdAt.toISOString()} className="text-muted-foreground text-sm">
          {isRecent ? formatDistance(createdAt, now, { addSuffix: true }) : formatPostDay(createdAt)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatPostDateTime(createdAt)}</TooltipContent>
    </Tooltip>
  );
};
