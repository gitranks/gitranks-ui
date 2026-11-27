import { AboutView } from '@/components/interviews/about/about-view';
import { INTERVIEWS_ABOUT_METADATA } from '@/lib/interviews/mine-about-seo';

/** How it works: not indexed while Interviews is not open to everyone. */
export const metadata = INTERVIEWS_ABOUT_METADATA;

/**
 * How it works: the same page for everyone, prerendered with no read. Its one button follows the person's bar, read
 * in the browser.
 */
export default function InterviewsAboutPage() {
  return <AboutView />;
}
