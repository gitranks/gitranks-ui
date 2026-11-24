import type { ContributeFairUseNotices } from '@/lib/workspace/contribute.types';

/**
 * Learn's top shows the Terms banner alone, from the same answer Contribute's top reads: the API says who has not read
 * the Terms yet, and a close is sent the same way, so closing it on either side closes it on both. Contribute's
 * messages, its block and its list's cut stay on Contribute.
 */
export function rulesBannerOf(fairUse: ContributeFairUseNotices | null | undefined): ContributeFairUseNotices | null {
  if (!fairUse?.rulesBanner) return null;
  return { rulesBanner: fairUse.rulesBanner, notices: [], block: null, listCut: null };
}
