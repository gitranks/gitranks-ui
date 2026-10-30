import { ContributeTabsNav } from './contribute-tabs-nav';
import { loadContribute } from '@/lib/contribute/contribute.data';
import { isOnboarded } from '@/lib/contribute/contribute-state';

/**
 * Contribute's tabs for the viewer: only once they are onboarded (a visitor has no view). The read is the page's own
 * (once per request). An outage leaves no tabs; the page says to try again.
 */
export async function ContributeTabs() {
  const view = await loadContribute().catch(() => undefined);
  return <ContributeTabsNav onboarded={isOnboarded(view)} />;
}
