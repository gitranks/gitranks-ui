'use client';

import { type FC, useEffect, useState } from 'react';

import type { OrgActivityData } from './org-activity.utils';
import { OrgActivityView, type OrgActivityViewState } from './org-activity-view';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { OrgActivityDocument, OrgActivityGroupBy } from '@/types/generated/graphql';

type OrgActivityCardProps = {
  login: string;
};

/** What one grouping returned: the chart, `null` for an org with no data, or a failed request. */
type Result = { chart: OrgActivityData | null } | { error: true };

/**
 * Loads the chart in the browser, so the server-rendered page carries no chart data. Each grouping
 * is fetched once; while the next one loads, the last chart stays on screen, dimmed.
 */
export const OrgActivityCard: FC<OrgActivityCardProps> = ({ login }) => {
  const [groupBy, setGroupBy] = useState<OrgActivityGroupBy>(OrgActivityGroupBy.Type);
  const [shownGroupBy, setShownGroupBy] = useState<OrgActivityGroupBy>(OrgActivityGroupBy.Type);
  const [results, setResults] = useState<Partial<Record<OrgActivityGroupBy, Result>>>({});

  const result = results[groupBy];

  useEffect(() => {
    if (result) {
      return;
    }

    let cancelled = false;

    graphqlClient(OrgActivityDocument, { login, groupBy })
      .then((data) => ({ chart: data?.organization?.activity ?? null }))
      .catch((error: unknown) => {
        console.error('Error loading the activity chart:', error);
        return { error: true as const };
      })
      .then((next) => {
        if (!cancelled) {
          setResults((prev) => ({ ...prev, [groupBy]: next }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [login, groupBy, result]);

  useEffect(() => {
    if (result) {
      setShownGroupBy(groupBy);
    }
  }, [result, groupBy]);

  // Clearing the failed result runs the request again.
  const handleRetry = () => setResults((prev) => ({ ...prev, [groupBy]: undefined }));

  return (
    <OrgActivityView
      groupBy={groupBy}
      state={viewState(groupBy, result, shownGroupBy, results[shownGroupBy])}
      onGroupByChange={setGroupBy}
      onRetry={handleRetry}
    />
  );
};

function viewState(
  groupBy: OrgActivityGroupBy,
  result: Result | undefined,
  shownGroupBy: OrgActivityGroupBy,
  shown: Result | undefined,
): OrgActivityViewState {
  if (!result) {
    // The next grouping is loading: keep the last chart, if there is one.
    return shown && 'chart' in shown && shown.chart?.months.length
      ? { status: 'loaded', chart: shown.chart, groupBy: shownGroupBy, refreshing: true }
      : { status: 'loading' };
  }

  if ('error' in result) {
    return { status: 'error' };
  }

  return result.chart?.months.length ? { status: 'loaded', chart: result.chart, groupBy } : { status: 'empty' };
}
