import type { ContributeFairUseNotices } from '@/lib/workspace/contribute.types';
import type { IssueRules } from '@/lib/workspace/fair-use';

/**
 * Learn's top shows the Terms banner alone, from the same answer Contribute's top reads: the API says who has not read
 * the Terms yet, and a close is sent the same way, so closing it on either side closes it on both. Only while the
 * rules reader says the rules are live: before, or while that is not known, Learn says nothing of them. Contribute's
 * messages, its block and its list's cut stay on Contribute.
 */
export function rulesBannerOf(
  fairUse: ContributeFairUseNotices | null | undefined,
  rules: IssueRules,
): ContributeFairUseNotices | null {
  if (!fairUse?.rulesBanner || rules.state !== 'live') return null;
  return { rulesBanner: fairUse.rulesBanner, notices: [], block: null, listCut: null };
}
