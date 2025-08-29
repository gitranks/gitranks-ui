import { SVGProps } from 'react';
import { LabelProps } from 'recharts';

import { PageProfileOverviewQuery } from '@/types/generated/graphql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomTooltipProps = { active?: boolean; payload?: any[] };

export type ValueLabelProps = Omit<SVGProps<SVGTextElement>, 'viewBox'> & LabelProps;

export type CartesianViewBox = { x: number; y: number; width: number; height: number };

export type BarChartLanguagesProps = {
  languages: NonNullable<PageProfileOverviewQuery['user']>['languages'];
  className?: string;
};
