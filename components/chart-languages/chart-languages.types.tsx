import type { SVGProps } from 'react';
import type { LabelProps } from 'recharts';

import type { PageProfileLanguagesQuery } from '@/types/generated/graphql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomTooltipProps = { active?: boolean; payload?: any[] };

export type ValueLabelProps = Omit<SVGProps<SVGTextElement>, 'viewBox'> & LabelProps;

export type CartesianViewBox = { x: number; y: number; width: number; height: number };

export type ChartLanguagesProps = {
  languages: NonNullable<PageProfileLanguagesQuery['user']>['languages'];
  className?: string;
};
