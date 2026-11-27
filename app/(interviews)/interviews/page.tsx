import type { Metadata } from 'next';

import { InterviewsHomeLive } from '@/components/interviews/home/home-live';
import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { HOME_POSITION_HINT_SCRIPT } from '@/lib/interviews/home-search';
import { interviewsHomeMetadataOf } from '@/lib/interviews/home-seo';

/** Its title, description, share picture (the top five's logos) and Markdown copy, from the cached home read. */
export async function generateMetadata(): Promise<Metadata> {
  return interviewsHomeMetadataOf(await loadInterviewsHome());
}

/**
 * `/interviews`: the landing for a visitor and for a person with no plan in progress, the person's own home once they
 * have one, and the search. The page is the same for everyone and prerendered from the cached home read, which never
 * throws; the person's side is read in the browser.
 */
export default async function InterviewsHomePage() {
  const home = await loadInterviewsHome();
  return (
    <>
      {/* Runs before the list is drawn: an address that keeps a position holds the list hidden until the search has read it. */}
      <script dangerouslySetInnerHTML={{ __html: HOME_POSITION_HINT_SCRIPT }} />
      <InterviewsHomeLive home={home} />
    </>
  );
}
