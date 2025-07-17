import { memo } from 'react';

import { Link } from '@/components/link/link';
import { Insight } from '@/types/generated/graphql';

import { RANK_DESCRIPTIONS } from '../app.consts';

type InsightTextProps = {
  insight: Insight;
};

const DEFAULT_RANKING_LINKS = {
  [`${RANK_DESCRIPTIONS.s.title.toLowerCase()}ing`]: '/by/stars/1',
  [`${RANK_DESCRIPTIONS.c.title.toLowerCase()}ing`]: '/by/contributions/1',
  [`${RANK_DESCRIPTIONS.f.title.toLowerCase()}ing`]: '/by/followers/1',
} as const;

/** Escapes RegExp metacharacters so the username is treated literally */
const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// stars ranking|contributor ranking|followers ranking
const rankingPattern = Object.values(RANK_DESCRIPTIONS)
  .map((data) => `${data.title.toLowerCase()}ing`)
  .join('|');

const InsightText: React.FC<InsightTextProps> = ({ insight }) => {
  console.log('render');
  const { text, data } = insight;
  const login = data?.user?.login;

  let combinedRegex: RegExp;
  if (login) {
    combinedRegex = new RegExp(`\\b(${escapeRegExp(login)}|${rankingPattern})\\b`, 'gi');
  } else {
    combinedRegex = new RegExp(`\\b(${rankingPattern})\\b`, 'gi');
  }
  const pieces = text.split(combinedRegex);

  return pieces.map((piece, idx) => {
    if (!piece) return null;

    if (login && login === piece) {
      return (
        <Link key={idx} href={`/profile/${login}`} className="text-foreground hover:text-foreground/80">
          {piece}
        </Link>
      );
    }

    const key = piece.toLowerCase();
    if (key in DEFAULT_RANKING_LINKS) {
      return (
        <Link key={idx} href={DEFAULT_RANKING_LINKS[key]!} className="text-foreground hover:text-foreground/80">
          {piece}
        </Link>
      );
    }

    return piece;
  });
};

export default memo(InsightText);
