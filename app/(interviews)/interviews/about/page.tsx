import type { Metadata } from 'next';

import { AboutView } from '@/components/interviews/about/about-view';
import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { interviewsAboutMetadataOf } from '@/lib/interviews/mine-about-seo';

/**
 * How it works: not indexed while Interviews is not open to everyone. Its link preview is Interviews' picture, whose
 * address follows the top five of the cached home read.
 */
export async function generateMetadata(): Promise<Metadata> {
  return interviewsAboutMetadataOf(await loadInterviewsHome());
}

/**
 * How it works: the same page for everyone, prerendered with no read. Its one button follows the person's bar, read
 * in the browser.
 */
export default function InterviewsAboutPage() {
  return <AboutView />;
}
