import { INTERVIEWS_PLACEHOLDER_METADATA, InterviewsPlaceholder } from '@/components/interviews/interviews-placeholder';

/** A company, until its page is built. */
export const metadata = INTERVIEWS_PLACEHOLDER_METADATA;

export default function InterviewCompanyPage() {
  return <InterviewsPlaceholder title="A company" />;
}
