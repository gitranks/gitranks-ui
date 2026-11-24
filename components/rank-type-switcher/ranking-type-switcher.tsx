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
  /**
   * The label beside the options from `sm` up, the options as wide as the screen below it: the switch on its own line
   * (a package ranking's, under its registry tabs).
   */
  beside?: boolean;
};

/** The orders a ranking can be shown in, as one group of links with the shown one marked. */
export const RankingTypeSwitcher: FC<RankingTypeSwitcherProps> = ({ options, label = 'Rank By:', beside = false }) => {
  if (beside) {
    return (
      <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-3">
        <span className="text-muted-foreground">{label}</span>
        <ButtonGroup className="w-full sm:w-fit">
          {options.map(({ href, label: optionLabel, active }) => (
            <LinkGroupItem key={href} href={href} active={active}>
              {optionLabel}
            </LinkGroupItem>
          ))}
        </ButtonGroup>
      </div>
    );
  }
  return (
    <div className="text-sm flex flex-col gap-1">
      {label}
      <ButtonGroup>
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
