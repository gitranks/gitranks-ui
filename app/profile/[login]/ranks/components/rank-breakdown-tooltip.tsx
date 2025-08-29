import { Info } from 'lucide-react';

import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';

export const RankBreakdownTooltip = () => {
  return (
    <AdaptiveTooltip trigger={<Info size={20} />}>
      <p className="max-w-96">
        We make the most of the GitHub API. On average the top 20% of GitHub profiles are updated every 2 weeks, while
        all other profiles are refreshed every 3–5 weeks. You can also trigger a manual refresh at any time (sign-in
        required so we can use your token). Ranks are recalculated daily based on the data in the database.
      </p>
    </AdaptiveTooltip>
  );
};
