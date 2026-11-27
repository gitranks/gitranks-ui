import { INTERVIEWS_PLACEHOLDER_METADATA, InterviewsPlaceholder } from '@/components/interviews/interviews-placeholder';

/** My interviews, until its page is built. */
export const metadata = INTERVIEWS_PLACEHOLDER_METADATA;

export default function InterviewsMinePage() {
  return <InterviewsPlaceholder title="My interviews" />;
}
