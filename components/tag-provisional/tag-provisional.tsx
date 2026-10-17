import { AdaptiveTooltip } from '../adaptive-tooltip/adaptive-tooltip';
import { Badge } from '../ui/badge';

export const TagProvisional = () => {
  return (
    <AdaptiveTooltip
      trigger={
        <Badge variant="secondary" className="px-1">
          provisional
        </Badge>
      }
    >
      <p className="max-w-72">
        Temporary estimate based on other users’ current ranks. A precise ranking replaces it after the next
        recalculation, within a few days.
      </p>
    </AdaptiveTooltip>
  );
};
