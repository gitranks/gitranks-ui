import { parse } from 'graphql';

import type { PrTimelineAnswer, PublicPrTimeline } from './pr-timeline.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** Whether pull request timelines are public: the proxy's question, no viewer needed. */
export const PrTimelineOpenDocument = doc<{ contributePrTimelineOpen: boolean }>(
  'query PrTimelineOpen { contributePrTimelineOpen }',
);

/** Whether timelines are open to the signed-in viewer: the approval's checkbox. */
export const PrTimelineViewerOpenDocument = doc<{ prTimelineOpen: boolean }>(
  'query PrTimelineViewerOpen { prTimelineOpen }',
);

const TIMELINE = `
  attemptId nameWithOwner number url title state openedAt mergedAt closedAt contributorLogin reviewed agentPhrase
  ownAgent stopped helped partial modifiedAt
  issue { number url }
  change { files added removed commits testsAdded }
  milestones {
    kind at by login text overridden minutes passed tries failingFirst files added removed testsAdded commits replies
    reviewState dayOnly number
  }
`;

export const PrTimelineDocument = doc<
  { contributePrTimeline: PrTimelineAnswer | null },
  { owner: string; repo: string; number: number }
>(`query PrTimeline($owner: String!, $repo: String!, $number: Int!) {
  contributePrTimeline(owner: $owner, repo: $repo, number: $number) {
    movedTo movedNumber
    timeline { ${TIMELINE} }
  }
}`);

/** By the footer's short address: only where the page lives, never the page itself. */
export const PrTimelineByAttemptDocument = doc<
  { contributePrTimelineByAttempt: { timeline: { nameWithOwner: string; number: number } | null } | null },
  { id: string }
>(`query PrTimelineByAttempt($id: ID!) {
  contributePrTimelineByAttempt(id: $id) { timeline { nameWithOwner number } }
}`);

export const PublicPrTimelinesDocument = doc<{ publicPrTimelines: PublicPrTimeline[] }>(
  'query PublicPrTimelines { publicPrTimelines { nameWithOwner number modifiedAt } }',
);

export const SetPrTimelineDocument = doc<
  { setContributePrTimeline: { attemptId: string; shown: boolean } },
  { attemptId: string; shown: boolean }
>(`mutation SetPrTimeline($attemptId: ID!, $shown: Boolean!) {
  setContributePrTimeline(attemptId: $attemptId, shown: $shown) { attemptId shown }
}`);
