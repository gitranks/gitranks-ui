import React from 'react';

import { RANK_DESCRIPTIONS, TIER_FRACTIONS, TIER_NAMES, TOP_LEVEL_FRACTIONS } from '@/app/app.consts';
import { Tier } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

import { Separator } from '../ui/separator';

type TiersExplanationProps = {
  rankedCount?: number;
  tiers?: Tier[];
  rankType: UserRankProp;
  tierData?: Tier;
};

export const TiersExplanation: React.FC<TiersExplanationProps> = ({ rankedCount, tiers, rankType, tierData }) => {
  if (!rankedCount || !tiers) {
    return null;
  }

  const { entityName } = RANK_DESCRIPTIONS[rankType];

  return (
    <section className="flex flex-col gap-6">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Tier</th>
            <th className="border-b p-2">Level</th>
            <th className="border-b p-2 text-right">Rank range</th>
            <th className="border-b p-2 text-right">Min {entityName}s</th>
          </tr>
        </thead>
        <tbody>
          {tiers?.map(({ tier, level, minRank, maxRank, minValue }) => {
            const isActive = tierData?.tier === tier && tierData?.level === level;
            return (
              <tr key={`${tier}-${level}`} className={`${isActive ? 'bg-accent' : ''}`}>
                <td className="border-b p-2">{TIER_NAMES[tier - 1]}</td>
                <td className="border-b p-2">{level}</td>
                <td className="border-b p-2 text-right">
                  #{minRank.toLocaleString('en-US')} – #{maxRank.toLocaleString('en-US')}
                </td>
                <td className="border-b p-2 text-right">{minValue.toLocaleString('en-US')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">How we turn raw ranks into tiers &amp; levels</h2>

        <p className="text-sm text-muted-foreground">
          We group all tracked profiles into&nbsp;
          <strong className="font-medium">{TIER_NAMES.length} tiers</strong>. Each tier gets a fixed share of the
          community, so the proportions stay the same even as more GitHub users are added.
        </p>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b p-2">Tier (worst → best)</th>
              <th className="border-b p-2 text-right">Share of profiles</th>
            </tr>
          </thead>
          <tbody>
            {TIER_NAMES.map((tier, i) => (
              <tr key={tier}>
                <td className="border-b p-2">{tier}</td>
                <td className="border-b p-2 text-right">{(TIER_FRACTIONS[i] * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Splitting tiers into levels</h3>

        <p className="text-sm text-muted-foreground">
          <b>
            {TIER_NAMES[0]} → {TIER_NAMES[TIER_NAMES.length - 2]}
          </b>{' '}
          are sliced into five equal levels (5 = strongest). For instance, if Expert covers 6% of all users, each Expert
          level holds 1.2% (6 ÷ 5).
        </p>

        <p className="text-sm text-muted-foreground">
          <b>{TIER_NAMES[TIER_NAMES.length - 1]}</b> is more granular - it rewards the very top. Its levels follow a{' '}
          {TOP_LEVEL_FRACTIONS.map((f) => `${(f * 100).toFixed(0)}%`).join(' / ')} split within the tier.
        </p>
      </div>

      <Separator />

      <footer className="text-sm text-muted-foreground">
        All ranking cut-offs are recalculated weekly for each ranking, so numbers may shift as we track more GitHub
        profiles.
      </footer>
    </section>
  );
};
