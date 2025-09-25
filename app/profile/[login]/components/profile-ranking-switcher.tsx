'use client';
import { usePathname } from 'next/navigation';
import type { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '@/components/button-group/button-group';

type ProfileRankingSwitcherProps = {
  countryName?: string | null;
  className?: string;
};

export const ProfileRankingSwitcher: FC<ProfileRankingSwitcherProps> = ({ countryName, className }) => {
  const pathname = usePathname();

  if (!countryName) {
    return null;
  }

  const isCountry = pathname.endsWith('/country');
  const basePath = pathname.replace(/\/country$/, '');

  return (
    <ButtonGroup className={className}>
      <LinkGroupItem href={basePath} active={!isCountry}>
        Global
      </LinkGroupItem>
      <LinkGroupItem href={`${basePath}/country`} active={isCountry}>
        {countryName}
      </LinkGroupItem>
    </ButtonGroup>
  );
};
