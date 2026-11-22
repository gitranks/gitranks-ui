'use client';

import { type FC, useEffect } from 'react';

import { isHeroRepo } from './unsung-hero';
import { reportHeroHit, useUnsungHero } from './use-unsung-hero';

/**
 * Counts a view of a repository's page when the repository is this week's Unsung hero; draws nothing, and reports
 * nothing for any other repository.
 */
export const HeroVisit: FC<{ owner: string; name: string }> = ({ owner, name }) => {
  const hero = useUnsungHero();
  const repo = `${owner}/${name}`;
  const isHero = isHeroRepo(hero, repo);

  useEffect(() => {
    if (isHero) reportHeroHit({ kind: 'visit', repo });
  }, [isHero, repo]);

  return null;
};
