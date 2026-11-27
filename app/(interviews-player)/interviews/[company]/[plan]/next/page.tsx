import { INTERVIEWS_PLACEHOLDER_METADATA, InterviewsPlaceholder } from '@/components/interviews/interviews-placeholder';

/** The connecting screen after a part of a plan: it has the strip, and no bar, until its page is built. */
export const metadata = INTERVIEWS_PLACEHOLDER_METADATA;

export default function InterviewNextPage() {
  return <InterviewsPlaceholder title="What comes next" />;
}
