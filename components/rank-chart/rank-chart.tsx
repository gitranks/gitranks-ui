'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Cell, Pie, PieChart } from 'recharts';

import { TIER_NAMES } from '@/app/app.consts';

import {
  ANIMATION_DELAY,
  CANVAS_MID,
  CANVAS_SIZE,
  DEFAULT_COLORS,
  DIM_OPACITY,
  FONT_SIZE,
  GAP_BETWEEN_TIERS,
  INNER_RADIUS,
  LABEL_RADIUS,
  LEVELS_PER_TIER,
  RADIUS,
  START_END_GAP,
  WEDGE_DEG,
} from './rank-chart.consts';
import type { ChartItemType, RankChartProps } from './rank-chart.types';
import { toXY } from './rank-chart.utils';

const PIE_DATA = TIER_NAMES?.reduce<ChartItemType[]>((acc, _, index) => {
  return [
    ...acc,
    ...Array.from({ length: LEVELS_PER_TIER }, (_, level) => ({
      value: 1,
      tier: index + 1,
      level: level + 1,
      isGap: false,
    })),
    { value: 0, tier: index + 1, level: -1, isGap: true },
  ];
}, []);

export function RankChart({ progress, colors = DEFAULT_COLORS, debug = false }: RankChartProps) {
  const isActive = useCallback(
    (item: ChartItemType) => {
      if (item.isGap || !progress) {
        return false;
      }

      if (item.tier < progress.tier) {
        // earlier cat
        return true;
      }

      if (item.tier > progress.tier) {
        // later cat
        return false;
      }

      // same cat
      return item.level <= progress.level;
    },
    [progress],
  );

  const idBase = useId();

  // Determine how many sectors should be active
  const activeCount = PIE_DATA.filter((d) => !d.isGap && isActive(d)).length;

  // Animation state: which sectors are currently activated
  const [activated, setActivated] = useState<boolean[]>(() => PIE_DATA.map(() => false));

  useEffect(() => {
    // Animate activation one by one
    const timeoutIds: NodeJS.Timeout[] = [];
    setActivated(PIE_DATA.map(() => false)); // Reset all to inactive first

    for (let i = 0, j = 0; i < PIE_DATA.length; i++) {
      if (PIE_DATA[i].isGap) continue;
      if (j >= activeCount) break;
      timeoutIds.push(
        setTimeout(() => {
          setActivated((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, j * ANIMATION_DELAY),
      );
      j++;
    }
    return () => timeoutIds.forEach(clearTimeout);
  }, [activeCount]);

  return (
    <div style={{ position: 'relative', width: CANVAS_SIZE, height: CANVAS_SIZE }}>
      <PieChart width={CANVAS_SIZE} height={CANVAS_SIZE} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={PIE_DATA}
          dataKey="value"
          cx={CANVAS_MID}
          cy={CANVAS_MID}
          outerRadius={RADIUS}
          innerRadius={INNER_RADIUS}
          startAngle={270 - START_END_GAP / 2}
          endAngle={-90 + START_END_GAP / 2}
          paddingAngle={1}
          stroke="none"
          isAnimationActive={false}
        >
          {PIE_DATA.map((d, i) =>
            d.isGap ? (
              <Cell key={i} fill="transparent" />
            ) : (
              <Cell
                key={i}
                fill={colors[(d.tier - 1) % colors.length]}
                fillOpacity={activated[i] ? 1 : DIM_OPACITY}
                style={{ transition: 'fill-opacity 0.3s' }}
              />
            ),
          )}
        </Pie>
      </PieChart>

      {/* label overlay */}
      <svg
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {debug && (
          <>
            <circle cx={CANVAS_MID} cy={CANVAS_MID} r={LABEL_RADIUS} fill="none" stroke="#8884" strokeDasharray="4 3" />
            <circle cx={CANVAS_MID} cy={CANVAS_MID} r={RADIUS + 0.5} fill="none" stroke="#f004" strokeDasharray="2 3" />
          </>
        )}

        <defs>
          {TIER_NAMES.map((_, i) => {
            const start = 180 + START_END_GAP / 2 + i * (WEDGE_DEG + GAP_BETWEEN_TIERS) + GAP_BETWEEN_TIERS / 2;
            const end = start + WEDGE_DEG;
            const large = WEDGE_DEG > 180 ? 1 : 0;
            const [sx, sy] = toXY(start, LABEL_RADIUS);
            const [ex, ey] = toXY(end, LABEL_RADIUS);
            return (
              <path
                key={i}
                id={`${idBase}-arc-${i}`}
                d={`M ${sx} ${sy} A ${LABEL_RADIUS} ${LABEL_RADIUS} 0 ${large} 1 ${ex} ${ey}`}
                fill="none"
              />
            );
          })}
        </defs>

        {TIER_NAMES.map((txt, i) => (
          <text
            key={i}
            fontSize={FONT_SIZE}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
          >
            <textPath href={`#${idBase}-arc-${i}`} startOffset="50%" className="fill-muted-foreground">
              {txt}
            </textPath>
          </text>
        ))}
      </svg>
    </div>
  );
}
