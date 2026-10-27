import type { FC } from 'react';

import { RepoPulseSections } from './repo-pulse-sections';
import { REPO_PULSE_MIN_STARS } from '@/app/app.consts';
import type { PulseFactsData } from '@/components/pulse/pulse.utils';

type RepoPulseAreaProps = {
  repo: { owner: string; name: string; stars: number; createdAt?: string | null };
  pulse: PulseFactsData | null;
};

/** The analytics when there are some; below the star threshold, a note on why there are none. */
export const RepoPulseArea: FC<RepoPulseAreaProps> = ({ repo, pulse }) => {
  if (pulse) {
    return <RepoPulseSections owner={repo.owner} name={repo.name} createdAt={repo.createdAt} pulse={pulse} />;
  }

  if (repo.stars >= REPO_PULSE_MIN_STARS) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground">
      {`Code and contributor analytics appear for repositories with ${REPO_PULSE_MIN_STARS.toLocaleString('en-US')}+ stars.`}
    </p>
  );
};
