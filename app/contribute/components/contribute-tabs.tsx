import { ContributeTabsNav } from './contribute-tabs-nav';
import { loadContribute, loadContributeActivity } from '@/lib/contribute/contribute.data';
import { isOnboarded } from '@/lib/contribute/contribute-state';

/**
 * Contribute's tabs for the viewer: only once they are onboarded (a visitor has no view), with what the API is working
 * on for them. The reads are the page's own (once per request). An outage leaves no tabs; the page says to try again.
 */
export async function ContributeTabs() {
  const [view, activity] = await Promise.all([
    loadContribute().catch(() => undefined),
    loadContributeActivity().catch(() => null),
  ]);
  return <ContributeTabsNav onboarded={isOnboarded(view)} activity={activity} />;
}
