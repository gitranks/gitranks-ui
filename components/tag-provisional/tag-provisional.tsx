import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const TagProvisional = () => {
  return (
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
  );
};
