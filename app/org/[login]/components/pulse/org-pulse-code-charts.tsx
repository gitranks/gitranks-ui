'use client';

import type { FC } from 'react';

import { GROUP_BY_OPTIONS, groupByLabel } from './org-pulse.utils';
import { CHART_HEIGHT, SeriesLegend } from './org-pulse-chart-parts';
import { InflowKey, LinesInflowChart, LinesSnapshotChart } from './org-pulse-lines-charts';
import { type LinesViewState, useOrgPulseSeries } from './org-pulse-series-provider';
import { useHydrated } from './use-hydrated';
import { ButtonGroup, ButtonGroupItem } from '@/components/button-group/button-group';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OrgActivityGroupBy } from '@/types/generated/graphql';

type OrgPulseCodeChartsViewProps = {
  groupBy: OrgActivityGroupBy;
  state: LinesViewState;
  onGroupByChange: (groupBy: OrgActivityGroupBy) => void;
  onRetry: () => void;
};

export const ChartLoading: FC<{ label: string; count?: number }> = ({ label, count = 1 }) => (
  <output className="flex flex-col gap-6">
    <span className="sr-only">{label}</span>
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} className="w-full" style={{ height: CHART_HEIGHT }} />
    ))}
  </output>
);

export const ChartError: FC<{ onRetry: () => void; what: string }> = ({ onRetry, what }) => (
  <div className="flex flex-col items-start gap-3 py-6">
    <p className="text-sm">{what} couldn&apos;t load.</p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);

/** The lines charts with their Type / Language / Kind switch; the switch drives both charts. */
export const OrgPulseCodeChartsView: FC<OrgPulseCodeChartsViewProps> = ({
  groupBy,
  state,
  onGroupByChange,
  onRetry,
}) => {
  // Hidden only when the org has no lines at all: after a failed or empty grouping, the switch is the way back.
  const showSwitch = state.status !== 'empty' || !!state.switchable;
  const shown = state.status === 'loaded' ? state.groupBy : groupBy;
  const grouping = groupByLabel(shown).toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      {showSwitch && (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground min-w-0">
          <legend className="sr-only">Group the lines charts by</legend>
          <span aria-hidden>Group by</span>
          <ButtonGroup>
            {GROUP_BY_OPTIONS.map((option) => (
              <ButtonGroupItem
                key={option.value}
                active={option.value === groupBy}
                onClick={() => onGroupByChange(option.value)}
              >
                {option.label}
              </ButtonGroupItem>
            ))}
          </ButtonGroup>
        </fieldset>
      )}

      {state.status === 'loading' && <ChartLoading label="Loading the lines charts" count={2} />}

      {state.status === 'error' && <ChartError what="The lines charts" onRetry={onRetry} />}

      {state.status === 'empty' && (
        <p className="py-6 text-sm text-muted-foreground">
          {state.switchable ? 'No counted lines for this grouping.' : 'No counted lines yet.'}
        </p>
      )}

      {state.status === 'loaded' && (
        <div
          className={cn('flex flex-col gap-5 transition-opacity', state.refreshing && 'opacity-60')}
          aria-busy={state.refreshing}
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-medium">Lines snapshot</h3>
            <p className="text-sm text-muted-foreground">Lines of code by {grouping} at each month end.</p>
            <LinesSnapshotChart series={state.series} grouping={grouping} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-medium">Lines inflow</h3>
            <p className="text-sm text-muted-foreground">Lines added and deleted each month by {grouping}.</p>
            <LinesInflowChart series={state.series} grouping={grouping} />
            <InflowKey />
          </div>
          <SeriesLegend labels={state.series.labels} />
        </div>
      )}
    </div>
  );
};

export const OrgPulseCodeCharts: FC = () => {
  const { groupBy, setGroupBy, lines, retry } = useOrgPulseSeries();
  const hydrated = useHydrated();

  // The series loads in the browser: the server-rendered page holds only the placeholder.
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4">
        {/* The switch row's space, so nothing moves when it appears. */}
        <div aria-hidden className="h-8" />
        <ChartLoading label="Loading the lines charts" count={2} />
      </div>
    );
  }

  return <OrgPulseCodeChartsView groupBy={groupBy} state={lines} onGroupByChange={setGroupBy} onRetry={retry} />;
};
