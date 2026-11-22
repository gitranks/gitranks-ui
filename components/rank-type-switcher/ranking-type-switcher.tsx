import type { Route } from 'next';
import type { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '../button-group/button-group';
import { RankingTypeClient } from '@/types/ranking.types';

/** One order a ranking can be shown in: its link, its label, and whether it is the one shown. */
export type RankingOption = { href: Route; label: string; active: boolean };

type RankingTypeSwitcherProps = {
  options: readonly RankingOption[];
  /** The words before the options. */
  label?: string;
  /** Lets the options run onto more lines on a narrow screen: for a switch with many of them (the registries). */
  wrap?: boolean;
};

/** The orders a ranking can be shown in, as one group of links with the shown one marked. */
export const RankingTypeSwitcher: FC<RankingTypeSwitcherProps> = ({ options, label = 'Rank By:', wrap = false }) => {
  return (
    <div className="text-sm flex flex-col gap-1">
      {label}
      <ButtonGroup className={wrap ? 'h-auto max-w-full flex-wrap justify-start' : undefined}>
        {options.map(({ href, label: optionLabel, active }) => (
          <LinkGroupItem key={href} href={href} active={active}>
            {optionLabel}
          </LinkGroupItem>
        ))}
      </ButtonGroup>
    </div>
  );
};

/** A developer ranking's three orders, worldwide (`/by`) or in one country (`/country/<name>`). */
export function developerRankingOptions(rankingType: RankingTypeClient, urlPrefix: string): RankingOption[] {
  return [
    { href: `${urlPrefix}/stars/1` as Route, label: 'Stars', active: rankingType === RankingTypeClient.Star },
    {
      href: `${urlPrefix}/contributions/1` as Route,
      label: 'Contributions',
      active: rankingType === RankingTypeClient.Contribution,
    },
    {
      href: `${urlPrefix}/followers/1` as Route,
      label: 'Followers',
      active: rankingType === RankingTypeClient.Follower,
    },
  ];
}
