'use client';
import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const RankBreakdownTooltip = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info size={20} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-96">
            We make the most of the GitHub API. On average the top 20% of GitHub profiles are updated every 2 weeks,
            while all other profiles are refreshed every 3–5 weeks. You can also trigger a manual refresh at any time
            (sign-in required so we can use your token). Ranks are recalculated daily based on the data in the database.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
