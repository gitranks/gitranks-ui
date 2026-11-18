/**
 * A GitRanks Contribute pull request's public timeline: what happened and when, from the issue's pick to the merge. The
 * API words nothing but the agent's own short text; every row is worded here from its kind and numbers.
 */

export type PrTimelineKind =
  | 'PICKED'
  | 'CHECKED'
  | 'WORKED'
  | 'CHECKS'
  | 'APPROVED'
  | 'OPENED'
  | 'REVIEWED'
  | 'FOLLOW_UP'
  | 'UPDATE_APPROVED'
  | 'PUSHED'
  | 'STOPPED'
  | 'CLOSED'
  | 'REOPENED'
  | 'MERGED';

export type PrTimelineActor = 'AGENT' | 'CONTRIBUTOR' | 'AUTOPILOT' | 'MAINTAINER' | 'GITRANKS' | 'NONE';

export type PrTimelineMilestone = {
  kind: PrTimelineKind;
  at: string;
  by: PrTimelineActor;
  login: string | null;
  text: string | null;
  overridden: boolean | null;
  minutes: number | null;
  passed: boolean | null;
  tries: number | null;
  failingFirst: boolean | null;
  files: number | null;
  added: number | null;
  removed: number | null;
  testsAdded: number | null;
  commits: number | null;
  replies: number | null;
  reviewState: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | null;
  dayOnly: boolean | null;
  number: number | null;
};

export type PrTimeline = {
  attemptId: string;
  nameWithOwner: string;
  number: number;
  url: string;
  title: string | null;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  openedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  contributorLogin: string | null;
  reviewed: boolean;
  agentPhrase: string;
  ownAgent: boolean;
  issue: { number: number; url: string };
  change: { files: number; added: number; removed: number; commits: number; testsAdded: number };
  stopped: boolean;
  helped: number;
  partial: boolean;
  modifiedAt: string;
  milestones: PrTimelineMilestone[];
};

/** The API's answer: the page, a move to the name the repo has now, or nothing (null). */
export type PrTimelineAnswer = { timeline: PrTimeline | null; movedTo: string | null; movedNumber: number | null };

export type PublicPrTimeline = { nameWithOwner: string; number: number; modifiedAt: string };
