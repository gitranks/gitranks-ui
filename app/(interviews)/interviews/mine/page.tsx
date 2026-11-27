import { InterviewsMineLive } from '@/components/interviews/mine/mine-live';
import { INTERVIEWS_MINE_METADATA } from '@/lib/interviews/mine-about-seo';

/** My interviews: only the person's own, so search engines never keep it. */
export const metadata = INTERVIEWS_MINE_METADATA;

/**
 * My interviews: every plan of the signed-in person, in progress and finished. The page holds nothing personal and
 * reads nothing on the server: the plans are read in the browser, and a visitor is asked to sign in there.
 */
export default function InterviewsMinePage() {
  return <InterviewsMineLive />;
}
