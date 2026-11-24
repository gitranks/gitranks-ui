import { cookies } from 'next/headers';

import { Header } from '@/components/header/header';
import { OriginHeaderPick } from '@/components/workspace/origin-header-pick';
import { audienceOf } from '@/lib/workspace/audience';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { LAST_BAR_COOKIE, lastBarOf } from '@/lib/workspace/settings-bar';

/**
 * The site header of the product the person came from, on a page both products open: the two headers, and what picks
 * one (`settingsBarOf`, as Settings picks its bar): the link's `?from=learn`, else the bar seen last, else the product
 * they use. A failed read of what they use counts as both.
 */
export async function OriginHeader() {
  const [view, jar] = await Promise.all([loadContribute().catch(() => null), cookies()]);
  return (
    <OriginHeaderPick
      audience={audienceOf(view?.sides)}
      lastBar={lastBarOf(jar.get(LAST_BAR_COOKIE)?.value)}
      learn={<Header section="learn" />}
      contribute={<Header section="contribute" />}
    />
  );
}
