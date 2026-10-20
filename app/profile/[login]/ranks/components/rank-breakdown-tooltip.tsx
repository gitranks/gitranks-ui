import { Info } from 'lucide-react';

import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';

export const RankBreakdownTooltip = () => {
  return (
    <AdaptiveTooltip trigger={<Info size={20} />}>
      <p className="max-w-96">
        Profiles are re-read from GitHub as GitRanks revisits them: no more often than every 2 weeks, and their
        pull-request history no more often than every 45 days. You can also refresh a profile yourself: your own profile
        once a day after signing in, or any profile at any time with your own GitHub token. Worldwide ranks are
        recalculated about every second day, country and language ranks about every fourth day.
      </p>
    </AdaptiveTooltip>
  );
};
