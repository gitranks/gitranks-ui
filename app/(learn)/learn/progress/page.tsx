import type { Metadata } from 'next';

import { MyProgressLive } from '@/components/learn/my-progress/my-progress-live';
import { myProgressDayOf, myProgressViewOf } from '@/lib/learn/my-progress';
import { LEARN_MY_PROGRESS_METADATA } from '@/lib/learn/seo/my-progress';

/**
 * My progress (page 18): only the person's own, so the page holds no personal data and is never indexed; the progress
 * is read in the browser. The address says the view (`?view=history`) and the day History opens at (`&day=`). The
 * page asks a visitor to sign in itself and reads nothing personal on the server.
 */
export const instant = false;

export const metadata: Metadata = LEARN_MY_PROGRESS_METADATA;

export default async function MyProgressPage({ searchParams }: PageProps<'/learn/progress'>) {
  const { view, day } = await searchParams;
  const shown = myProgressViewOf(view);
  return <MyProgressLive view={shown} day={shown === 'history' ? myProgressDayOf(day) : null} />;
}
