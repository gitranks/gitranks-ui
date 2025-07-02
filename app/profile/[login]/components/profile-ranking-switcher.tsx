import { FC } from 'react';

import { LinkGroup, LinkGroupItem } from '@/components/link-group/link-group';

type ProfileRankingSwitcherProps = {
  login: string;
  ranking: 'global' | 'country';
};

export const ProfileRankingSwitcher: FC<ProfileRankingSwitcherProps> = ({ login, ranking }) => {
  return (
    <div className="text-sm">
      <LinkGroup>
        <LinkGroupItem href={`/profile/${login}`} active={ranking === 'global'}>
          Global
        </LinkGroupItem>
        <LinkGroupItem href={`/profile/${login}/country`} active={ranking === 'country'}>
          Country
        </LinkGroupItem>
      </LinkGroup>
    </div>
  );
};
