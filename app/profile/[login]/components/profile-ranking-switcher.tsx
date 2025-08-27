import { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '@/components/button-group/button-group';

type ProfileRankingSwitcherProps = {
  login: string;
  ranking: 'global' | 'country';
};

export const ProfileRankingSwitcher: FC<ProfileRankingSwitcherProps> = ({ login, ranking }) => {
  return (
    <div className="text-sm">
      <ButtonGroup>
        <LinkGroupItem href={`/profile/${login}`} active={ranking === 'global'}>
          Global
        </LinkGroupItem>
        <LinkGroupItem href={`/profile/${login}/country`} active={ranking === 'country'}>
          Country
        </LinkGroupItem>
      </ButtonGroup>
    </div>
  );
};
