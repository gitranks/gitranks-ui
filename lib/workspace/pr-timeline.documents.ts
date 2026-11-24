import { parse } from 'graphql';

import type { PrTimelineAnswer, PrTimelineHelped, PublicPrTimeline } from './pr-timeline.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

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

/**
 * The people who said a pull request helped, by name: its own read beside the page's, so the page's read keeps its
 * shape and an API that does not know these fields fails this read alone.
 */
export const PrTimelineHelpedDocument = doc<
  { contributePrTimeline: { timeline: PrTimelineHelped | null } | null },
  { owner: string; repo: string; number: number }
>(`query PrTimelineHelped($owner: String!, $repo: String!, $number: Int!) {
  contributePrTimeline(owner: $owner, repo: $repo, number: $number) {
    timeline { helpedBy helpedNamed }
  }
}`);
