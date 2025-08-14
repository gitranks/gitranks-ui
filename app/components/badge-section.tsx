import { Link } from '@/components/link/link';
import { BadgeMeta, BadgeRanking, BadgeType } from '@/types/badge.types';

import BadgeExample from '../badge/gallery/components/badge-example';

export const BadgeSection = () => {
  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold">Put Your GitHub Rank on Display</h2>
      <div>
        Show off your coding achievements with a dynamic GitHub badge. Let the world see exactly where you stand among
        millions of developers.
      </div>
      <div className="flex gap-3">
        <BadgeExample label="Stars Rank" />
        <BadgeExample
          label="Contribution Score"
          ranking={BadgeRanking.c}
          type={BadgeType.Score}
          valueBgColor="#1e3a8a"
        />
        <BadgeExample
          label="Contributor Rank"
          ranking={BadgeRanking.c}
          type={BadgeType.Percentile}
          valueBgColor="#7f5539"
        />
        <BadgeExample label="Stars Rank" meta={BadgeMeta.MonthlyChange} />
        <BadgeExample
          label="Total Followers"
          ranking={BadgeRanking.f}
          meta={BadgeMeta.Percentile}
          valueBgColor="#1e3a8a"
        />
      </div>
      <div>
        <Link href="/badge/gallery">View Badge Gallery</Link>
      </div>
    </div>
  );
};
