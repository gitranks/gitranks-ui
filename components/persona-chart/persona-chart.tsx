'use client';
import React, { useMemo } from 'react';
import { RadarChart, Radar, PolarAngleAxis, PolarRadiusAxis, PolarGrid } from 'recharts';

import { Tier } from '@/types/generated/graphql';
import { PersonaType } from '@/types/persona.types';

export interface PersonaChartProps {
  sTier?: Tier;
  cTier?: Tier;
  fTier?: Tier;
}

const SIZE = 200;
const RADIUS = SIZE / 2;
const CHART_RADIUS = RADIUS - 8;
const FILL = '#00A8E8';

const calculateRank = (tier?: Tier) => (tier ? (tier.tier - 1) * 5 + tier.level : 0);

export const PersonaChart: React.FC<PersonaChartProps> = ({ sTier, cTier, fTier }) => {
  const ranks = useMemo(
    () => [calculateRank(sTier), calculateRank(cTier), calculateRank(fTier)],
    [sTier, cTier, fTier],
  );
  const maxRank = Math.max(...ranks) || 1;

  const data = [
    { axis: PersonaType.s, value: ranks[0] },
    { axis: PersonaType.c, value: ranks[1] },
    { axis: PersonaType.f, value: ranks[2] },
  ];

  /**
   * Custom axis label renderer keeps text within the padded area.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderAxisLabel = ({ payload, x, y }: any) => {
    const label = payload.value as string;

    let dx = 0;
    let dy = 0;
    if (label === 'Creator') {
      dy = -2;
    } else if (label === 'Contributor') {
      dy = 8;
      dx = -28;
    } else if (label === 'Influencer') {
      dy = 8;
      dx = 28;
    }

    return (
      <text
        x={x + dx}
        y={y + dy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        className="fill-muted-foreground"
      >
        {label}
      </text>
    );
  };

  return (
    <div style={{ width: SIZE, height: SIZE }}>
      <RadarChart
        width={SIZE}
        height={SIZE}
        cx={RADIUS}
        cy={RADIUS + 22}
        outerRadius={CHART_RADIUS}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarGrid radialLines={false} strokeDasharray="3 3" className="stroke-muted-foreground" strokeOpacity={0.4} />
        <PolarAngleAxis dataKey="axis" tick={renderAxisLabel} tickLine={false} />
        <PolarRadiusAxis domain={[0, maxRank]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={FILL} fill={FILL} fillOpacity={0.5} isAnimationActive={false} />
      </RadarChart>
    </div>
  );
};
