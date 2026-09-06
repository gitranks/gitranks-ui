import type { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '../button-group/button-group';
import { RankingTypeClient } from '@/types/ranking.types';

type RankingTypeSwitcherProps = {
  rankingType: RankingTypeClient;
  urlPrefix?: string;
};

export const RankingTypeSwitcher: FC<RankingTypeSwitcherProps> = ({ rankingType, urlPrefix }) => {
  return (
    <div className="text-sm flex flex-col gap-1">
      Rank By:
      <ButtonGroup>
        <LinkGroupItem href={`${urlPrefix}/stars/1`} active={rankingType === RankingTypeClient.Star}>
          Stars
        </LinkGroupItem>
        <LinkGroupItem href={`${urlPrefix}/contributions/1`} active={rankingType === RankingTypeClient.Contribution}>
          Contributions
        </LinkGroupItem>
        <LinkGroupItem href={`${urlPrefix}/followers/1`} active={rankingType === RankingTypeClient.Follower}>
          Followers
        </LinkGroupItem>
      </ButtonGroup>
    </div>
  );
};
