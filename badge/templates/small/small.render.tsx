import satori from 'satori';

import { BadgeServiceProps } from '@/badge/badge.types';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GlobalRankByLoginDocument } from '@/types/generated/graphql';

import { BadgeSmall } from './small';
import { SMALL_BADGE_HEIGHT, SMALL_BADGE_WIDTH } from './small.consts';

export async function renderSmallBadge({ theme, login, rankingType }: BadgeServiceProps) {
  const { globalRankByLogin } = await graphqlDirect(GlobalRankByLoginDocument, { login });

  if (!globalRankByLogin) {
    return;
  }

  return satori(
    <BadgeSmall theme={theme} rankingType={rankingType} data={globalRankByLogin} />,
    await getSatoriConfig({
      fontOptions: [
        { style: 'normal', weight: 400 },
        { style: 'normal', weight: 600 },
        { style: 'normal', weight: 700 },
      ],
      width: SMALL_BADGE_WIDTH,
      height: SMALL_BADGE_HEIGHT,
    }),
  );
}
