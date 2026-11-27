import { InterviewsHomeLive } from '@/components/interviews/home/home-live';
import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { INTERVIEWS_HOME_METADATA } from '@/lib/interviews/home-seo';

/**
 * `/interviews`: the landing for a visitor and for a person with no plan in progress, the person's own home once they
 * have one, and the search. The page is the same for everyone and prerendered from the cached home read, which never
 * throws; the person's side is read in the browser.
 */
export const metadata = INTERVIEWS_HOME_METADATA;

export default async function InterviewsHomePage() {
  return <InterviewsHomeLive home={await loadInterviewsHome()} />;
}
