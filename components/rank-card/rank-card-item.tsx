import { Medal, Star, UserRound, UsersRound } from 'lucide-react';
import { FC } from 'react';

import { RANK_DESCRIPTIONS } from '@/app/app.consts';
import { cn } from '@/lib/utils';
import { UserRankProp } from '@/types/ranking.types';
import { formatNumberShort } from '@/utils/format-number-short';

import {
  RankCardItemProps,
  RankCardPositionProps,
  RankCardTotalProfilesRankedProps,
  RankCardTotalValueProps,
} from './rank-card.types';
import { Link } from '../link/link';

export const RankCardItem: FC<RankCardItemProps> = ({ Icon, children, className }) => {
  return (
    <div className={cn('flex flex-row items-center gap-2', className)}>
      {!!Icon && <Icon size={20} className="shrink-0" />}
      {children}
    </div>
  );
};

export const RankCardPosition: FC<RankCardPositionProps> = ({ rank, rankedCount, rankingLink }) => {
  return (
    <RankCardItem Icon={Medal}>
      Position: {rank?.toLocaleString('en-US')}{' '}
      <span className="text-muted-foreground text-xs">
        /{' '}
        <Link href={rankingLink} title="View Ranking">
          {formatNumberShort(rankedCount)}
        </Link>
      </span>
    </RankCardItem>
  );
};

export const RankCardTotalProfilesRanked: FC<RankCardTotalProfilesRankedProps> = ({ rankedCount, rankingLink }) => {
  return (
    <RankCardItem Icon={UserRound}>
      Profiles ranked:{' '}
      <Link href={rankingLink} title="View Ranking">
        {rankedCount?.toLocaleString('en-US')}
      </Link>
    </RankCardItem>
  );
};

export const RankCardTotalValue: FC<RankCardTotalValueProps> = ({ score, rankType, login }) => {
  let linkText: string | undefined;
  if (rankType === UserRankProp.s) {
    linkText = 'repositories';
  } else if (rankType === UserRankProp.c) {
    linkText = 'contributions';
  }

  const { entityName } = RANK_DESCRIPTIONS[rankType];

  return (
    <RankCardItem Icon={rankType === 'f' ? UsersRound : Star}>
      Total {entityName}s: {(score || 0).toLocaleString('en-US')}{' '}
      {linkText && !!score && (
        <Link href={`/profile/${login}/repositories`} className="text-sm">
          {linkText}
        </Link>
      )}
    </RankCardItem>
  );
};
