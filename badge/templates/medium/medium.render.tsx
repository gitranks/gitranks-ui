import satori from 'satori';

import { BadgeServiceProps } from '@/badge/badge.types';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GlobalRankByLoginDocument } from '@/types/generated/graphql';

import { BadgeMedium } from './medium';
import { MEDIUM_BADGE_HEIGHT, MEDIUM_BADGE_WIDTH } from './medium.consts';

export async function renderMediumBadge({ theme, login, rankingType }: BadgeServiceProps) {
  const { globalRankByLogin } = await graphqlDirect(GlobalRankByLoginDocument, { login });

  if (!globalRankByLogin) {
    return;
  }

  return satori(
    <BadgeMedium theme={theme} rankingType={rankingType} data={globalRankByLogin} />,
    await getSatoriConfig({
      fontOptions: [{ weight: 400 }, { weight: 600 }, { weight: 700 }],
      width: MEDIUM_BADGE_WIDTH,
      height: MEDIUM_BADGE_HEIGHT,
    }),
  );
}
