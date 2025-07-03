import { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { PersonaChart } from '@/components/persona-chart/persona-chart';
import { RankChart } from '@/components/rank-chart/rank-chart';
import { Tier } from '@/types/generated/graphql';
import { PersonaType } from '@/types/persona.types';

import { ProfileCardsGrid } from './profile-card';
import { ProfileChartCard, ProfileChartDataSlot, ProfileChartSlot } from './profile-chart-card';
import { BestTierResult } from '../utils/calculate-tiers/calculate-tiers.types';

type ProfileChartsProps = {
  rankChartTitle: string;
  sTier?: Tier;
  cTier?: Tier;
  fTier?: Tier;
  bestTier?: BestTierResult | null;
};

export const ProfileCharts: FC<ProfileChartsProps> = ({ rankChartTitle, sTier, cTier, fTier, bestTier }) => {
  if (!bestTier?.data?.tier) {
    return null;
  }

  return (
    <ProfileCardsGrid>
      <ProfileChartCard>
        <ProfileChartSlot>
          <RankChart progress={bestTier?.data} />
        </ProfileChartSlot>
        <ProfileChartDataSlot
          tooltip={
            <div className="max-w-72">
              This is your <b>highest rank</b> among Stars, Contributor, and Followers rankings. Click on a rank in the{' '}
              <i>Ranks Breakdown</i> section to see detailed explanations of each ranking.
            </div>
          }
          title={rankChartTitle}
          value={`${TIER_NAMES[bestTier?.data?.tier - 1]} ${bestTier?.data?.level}`}
        />
      </ProfileChartCard>
      <ProfileChartCard>
        <ProfileChartSlot>
          <PersonaChart sTier={sTier} cTier={cTier} fTier={fTier} />
        </ProfileChartSlot>
        <ProfileChartDataSlot
          tooltip={
            <div className="max-w-72">
              The Persona reflects where the profile ranks best:
              <ul className="list-disc pl-4">
                <li>
                  <b>Creator:</b> Top rank comes from Stars
                </li>
                <li>
                  <b>Contributor:</b> Top rank is in Contributor
                </li>
                <li>
                  <b>Influencer:</b> Top rank is in Followers
                </li>
              </ul>
            </div>
          }
          title="Persona"
          value={`${bestTier?.source.map((t) => PersonaType[t]).join(', ')}`}
        />
      </ProfileChartCard>
    </ProfileCardsGrid>
  );
};
