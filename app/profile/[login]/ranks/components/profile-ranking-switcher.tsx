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
        <LinkGroupItem href={`/profile/${login}/ranks`} active={ranking === 'global'}>
          Global
        </LinkGroupItem>
        <LinkGroupItem href={`/profile/${login}/ranks/country`} active={ranking === 'country'}>
          Country
        </LinkGroupItem>
      </LinkGroup>
    </div>
  );
};
