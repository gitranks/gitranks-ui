import satori from 'satori';

import { graphqlRequest } from '@/lib/graphql-request';
import { RankByLoginDocument } from '@/types/generated/graphql';
import { BadgeSmall } from './small';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { BadgeServiceProps } from '@/badge/badge.types';
import { SMALL_BADGE_HEIGHT, SMALL_BADGE_WIDTH } from './small.consts';

export async function renderSmallBadge({ theme, login, type }: BadgeServiceProps) {
  const { rankByLogin } = await graphqlRequest(RankByLoginDocument, { login });

  if (!rankByLogin) {
    return;
  }

  return satori(
    <BadgeSmall theme={theme} type={type} data={rankByLogin} />,
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
