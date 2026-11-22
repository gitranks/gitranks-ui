import { contributor, limits, views } from './contribute-views';
import type {
  ContributeFairUseNotice,
  ContributeFairUseNotices,
  ContributeListSize,
  ContributeView,
} from '@/lib/workspace/contribute.types';

/** The messages as the API words them, filled: a made-up pull request on a made-up repository. */
const PR = { name: 'acme/widgets#412', url: 'https://github.com/acme/widgets/pull/412' };

const OUTSIDE_PR_1 =
  'We found a pull request that you opened yourself for an issue from your GitRanks list: acme/widgets#412. GitRanks watches 50,000 repositories and reads about 3,000 issues with AI every day to find the best ones to work on. This costs us money and work, and the service is free for you. Every pull request for an issue from your list goes through GitRanks and carries a small footer with a link to GitRanks. That link is how other developers find us. This is the only thing we ask in return. Why did you use another way?';
const OUTSIDE_PR_2 =
  'After our message we again found a pull request that you opened yourself for an issue from your GitRanks list: acme/widgets#412. Your list is now 10 issues. If we find such pull requests again in the future, your account will be blocked. If something in GitRanks is in your way, tell us here.';
const OUTSIDE_PR_3 =
  'After our warning we again found a pull request that you opened yourself for an issue from your GitRanks list: acme/widgets#412. Your account is blocked: no new issues and no claims. Your open pull requests keep working. If this is a mistake, answer here.';
const VIEWING_1 =
  'You have looked at 140 issues on GitRanks and opened 1 pull requests through it. Is something in the way? Do you need help?';

/** A message of each kind the pages draw; the first step's, with its choices, unless `patch` says otherwise. */
export const fairUseNotice = (patch: Partial<ContributeFairUseNotice> = {}): ContributeFairUseNotice => ({
  id: '583231-outsidePr-1-1',
  kind: 'OUTSIDE_PR_1',
  rule: 'OUTSIDE_PR',
  phase: 1,
  text: OUTSIDE_PR_1,
  vars: { prs: [PR], n: null, k: null },
  choices: [
    { id: 'approval_slow', label: 'approval took too long' },
    { id: 'agent_did_it', label: 'my agent did it on its own' },
    { id: 'edit_first', label: 'I wanted to edit the pull request first' },
    { id: 'other', label: 'something else' },
  ],
  createdAt: '2026-10-27T09:30:00.000Z',
  dismissedAt: null,
  answer: null,
  ...patch,
});

export const warningNotice = fairUseNotice({
  id: '583231-outsidePr-2-1',
  kind: 'OUTSIDE_PR_2',
  phase: 2,
  text: OUTSIDE_PR_2,
  choices: [],
});

export const blockNotice = fairUseNotice({
  id: '583231-outsidePr-3-1',
  kind: 'OUTSIDE_PR_3',
  phase: 3,
  text: OUTSIDE_PR_3,
  choices: [],
});

export const viewingNotice = fairUseNotice({
  id: '583231-viewing-1-1',
  kind: 'VIEWING_1',
  rule: 'VIEWING',
  text: VIEWING_1,
  vars: { prs: null, n: 140, k: 1 },
  choices: [
    { id: 'setup_failed', label: 'I could not set it up' },
    { id: 'issues_do_not_fit', label: 'the issues do not fit me' },
    { id: 'only_looking', label: 'I am only looking for now' },
    { id: 'other', label: 'something else' },
  ],
});

export const answeredNotice = fairUseNotice({
  answer: {
    choice: 'approval_slow',
    text: 'The approval page did not load on my phone, so I opened it from my laptop by hand. I will wait for it next time.',
    at: '2026-10-27T10:00:00.000Z',
  },
});

/** What the API answers while its switches are off: nothing to show. */
export const noFairUse: ContributeFairUseNotices = { rulesBanner: null, notices: [], block: null, listCut: null };

export const rulesBanner: ContributeFairUseNotices['rulesBanner'] = {
  text: 'We updated our Terms of service. GitRanks Contribute has a new rule. By continuing to use Contribute you agree to it.',
  linkText: 'Read the new rule',
  path: '/terms#contribute-rules',
};

export const fairUse = (patch: Partial<ContributeFairUseNotices> = {}): ContributeFairUseNotices => ({
  ...noFairUse,
  ...patch,
});

/** The list's size: a Pro with no merged pull request, its list not cut, unless `patch` says otherwise. */
export const listSize = (patch: Partial<ContributeListSize> = {}): ContributeListSize => ({
  size: 30,
  base: 30,
  tier: 3,
  merged: 0,
  cut: false,
  ...patch,
});

/** An account a fair-use rule blocked, with the block's message read. */
export const fairUseBlocked: ContributeView = {
  ...views.suspended,
  contributor: contributor({ limits: { ...limits.suspended, reason: 'FAIR_USE' } }),
  fairUseBlock: blockNotice,
};
