import type { FC } from 'react';

import { formatBytes } from '@/utils/format-bytes';

import type { CustomTooltipProps } from './chart-languages.types';

export const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const { name, score, size } = payload[0].payload ?? {};
    return (
      <div className="flex flex-col rounded-lg bg-background p-2 text-sm shadow-lg">
        <div className="font-medium">{name}</div>
        {!!score && <div>Score: {score.toLocaleString('en-US')} stars</div>}
        <div>Size: {formatBytes(size)}</div>
      </div>
    );
  }
  return null;
};
