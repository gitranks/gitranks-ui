import { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { PersonaChart } from '@/components/persona-chart/persona-chart';
import { RankChart } from '@/components/rank-chart/rank-chart';
import { Tier } from '@/types/generated/graphql';
import { PersonaType } from '@/types/persona.types';

import { ProfileCardsGrid } from './profile-card';
import { ProfileChartCard, ProfileChartDataSlot, ProfileChartSlot } from './profile-chart-card';
import { BestTierResult, ProfileTierType } from '../utils/calculate-tiers/calculate-tiers.types';

type ProfileChartsProps = {
  rankChartTitle: string;
  tiers?: Tier[] | null;
  sTier: ProfileTierType;
  cTier: ProfileTierType;
  fTier: ProfileTierType;
  bestTier?: BestTierResult | null;
};

export const ProfileCharts: FC<ProfileChartsProps> = ({ rankChartTitle, tiers, sTier, cTier, fTier, bestTier }) => {
  if (!bestTier?.data?.tier) {
    return null;
  }

  return (
    <ProfileCardsGrid>
      <ProfileChartCard>
        <ProfileChartSlot>
          <RankChart progress={bestTier?.data} tiers={tiers} />
        </ProfileChartSlot>
        <ProfileChartDataSlot
          title={rankChartTitle}
          value={`${TIER_NAMES[bestTier?.data?.tier - 1]} ${bestTier?.data?.level}`}
        />
      </ProfileChartCard>
      <ProfileChartCard>
        <ProfileChartSlot>
          <PersonaChart sTier={sTier.data} cTier={cTier.data} fTier={fTier.data} />
        </ProfileChartSlot>
        <ProfileChartDataSlot title="Persona" value={`${bestTier?.source.map((t) => PersonaType[t]).join(', ')}`} />
      </ProfileChartCard>
    </ProfileCardsGrid>
  );
};
