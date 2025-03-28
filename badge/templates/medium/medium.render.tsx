import satori from 'satori';

import { graphqlRequest } from '@/lib/graphql-request';
import { RankByLoginDocument } from '@/types/generated/graphql';
import { BadgeMedium } from './medium';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { BadgeServiceProps } from '@/badge/badge.types';
import { MEDIUM_BADGE_HEIGHT, MEDIUM_BADGE_WIDTH } from './medium.consts';

export async function renderMediumBadge({ theme, login, type }: BadgeServiceProps) {
  const { rankByLogin } = await graphqlRequest(RankByLoginDocument, { login });

  if (!rankByLogin) {
    return;
  }

  return satori(
    <BadgeMedium theme={theme} type={type} data={rankByLogin} />,
    await getSatoriConfig({
      fontOptions: [
        { style: 'normal', weight: 400 },
        { style: 'normal', weight: 600 },
        { style: 'normal', weight: 700 },
      ],
      width: MEDIUM_BADGE_WIDTH,
      height: MEDIUM_BADGE_HEIGHT,
    }),
  );
}
