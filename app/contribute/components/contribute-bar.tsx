import { ContributeBarNav, ContributeBarView } from './contribute-nav';
import { loadContribute, viewerLogin } from '@/lib/contribute/contribute.data';
import { isOnboarded } from '@/lib/contribute/contribute-state';

/**
 * Contribute's bar for the signed-in viewer: the tabs once they are onboarded, and their account. The read is the
 * page's own (once per request). An outage leaves the bar without tabs; the page says to try again.
 */
export async function ContributeBar() {
  const [login, view] = await Promise.all([viewerLogin(), loadContribute().catch(() => undefined)]);
  return (
    <ContributeBarNav
      signedIn={!!login}
      allowed={!!view}
      onboarded={isOnboarded(view)}
      contributor={!!view?.contributor}
    />
  );
}

/** The bar while the viewer is read: no tabs, no account. */
export function ContributeBarFallback() {
  return <ContributeBarView />;
}
