'use client';

import { type FC, useEffect, useRef, useState } from 'react';

import type { OrgActivityData } from './org-activity.utils';
import { OrgActivityView, type OrgActivityViewState } from './org-activity-view';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { OrgActivityDocument, OrgActivityGroupBy } from '@/types/generated/graphql';

type OrgActivityCardProps = {
  login: string;
};

/** What one grouping returned: the chart, `null` for an org with no data, or a failed request. */
export type ActivityResult = { chart: OrgActivityData | null } | { error: true };

/** Results by `resultKey`, so a response that lands after a switch is kept under its own org and grouping. */
export type ActivityResults = Partial<Record<string, ActivityResult>>;

export const resultKey = (login: string, groupBy: OrgActivityGroupBy) => `${login}\n${groupBy}`;

const hasMonths = (result: ActivityResult | undefined): result is { chart: OrgActivityData } =>
  !!result && 'chart' in result && !!result.chart?.months.length;

/**
 * What the card shows for the selected grouping:
 * - while it loads, the last chart with data stays on screen, dimmed (`refreshing`);
 * - a failed request is an error, with the switch still there to go back to a loaded grouping;
 * - a grouping with no months is empty; the switch stays only if another grouping of this org has data.
 */
export function viewState(
  results: ActivityResults,
  login: string,
  groupBy: OrgActivityGroupBy,
  shownGroupBy: OrgActivityGroupBy,
): OrgActivityViewState {
  const result = results[resultKey(login, groupBy)];
  const shown = results[resultKey(login, shownGroupBy)];

  if (!result) {
    return hasMonths(shown)
      ? { status: 'loaded', chart: shown.chart, groupBy: shownGroupBy, refreshing: true }
      : { status: 'loading' };
  }

  if ('error' in result) {
    return { status: 'error' };
  }

  if (hasMonths(result)) {
    return { status: 'loaded', chart: result.chart, groupBy };
  }

  const switchable = Object.values(OrgActivityGroupBy).some((other) => hasMonths(results[resultKey(login, other)]));

  return { status: 'empty', switchable };
}

/**
 * Loads the chart in the browser, so the server-rendered page carries no chart data. Each grouping
 * is fetched once: a request still in flight when the user switches is kept, not repeated.
 */
export const OrgActivityCard: FC<OrgActivityCardProps> = ({ login }) => {
  const [groupBy, setGroupBy] = useState<OrgActivityGroupBy>(OrgActivityGroupBy.Type);
  const [shownGroupBy, setShownGroupBy] = useState<OrgActivityGroupBy>(OrgActivityGroupBy.Type);
  const [results, setResults] = useState<ActivityResults>({});
  const inFlight = useRef(new Set<string>());

  const key = resultKey(login, groupBy);
  const result = results[key];

  useEffect(() => {
    if (result || inFlight.current.has(key)) {
      return;
    }

    inFlight.current.add(key);

    graphqlClient(OrgActivityDocument, { login, groupBy })
      .then((data): ActivityResult => ({ chart: data?.organization?.activity ?? null }))
      .catch((error: unknown): ActivityResult => {
        console.error('Error loading the activity chart:', error);
        return { error: true };
      })
      .then((next) => {
        inFlight.current.delete(key);
        setResults((prev) => ({ ...prev, [key]: next }));
      });
  }, [key, login, groupBy, result]);

  useEffect(() => {
    if (hasMonths(result)) {
      setShownGroupBy(groupBy);
    }
  }, [result, groupBy]);

  // Clearing the failed result runs the request again.
  const handleRetry = () => setResults((prev) => ({ ...prev, [key]: undefined }));

  return (
    <OrgActivityView
      groupBy={groupBy}
      state={viewState(results, login, groupBy, shownGroupBy)}
      onGroupByChange={setGroupBy}
      onRetry={handleRetry}
    />
  );
};
