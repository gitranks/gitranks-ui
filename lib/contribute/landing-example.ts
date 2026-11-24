import type { IssueRules } from '@/lib/workspace/fair-use';

/** How the landing shows its example issue: as lists show it under the rules that hold, or only what both share. */
export type LandingExample = 'named' | 'masked' | 'shared';

/** The example by the rules' state: masked once live, named before, only what both share while unknown. */
export const landingExampleOf = (rules: IssueRules): LandingExample =>
  rules.state === 'live' ? 'masked' : rules.state === 'before' ? 'named' : 'shared';
