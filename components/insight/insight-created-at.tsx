import { format, formatDistanceToNow } from 'date-fns';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type InsightCreatedAtProps = {
  createdAt: Date;
};

export const InsightCreatedAt = ({ createdAt }: InsightCreatedAtProps) => {
  const isWithinLast24Hours = Date.now() - createdAt.getTime() < 24 * 60 * 60 * 1000;

  if (isWithinLast24Hours) {
    return <div className="text-muted-foreground text-sm">{formatDistanceToNow(createdAt, { addSuffix: true })}</div>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-muted-foreground text-sm">{format(createdAt, 'MMM d')}</div>
      </TooltipTrigger>
      <TooltipContent>{format(createdAt, "MMM d',' h:mm a")}</TooltipContent>
    </Tooltip>
  );
};
