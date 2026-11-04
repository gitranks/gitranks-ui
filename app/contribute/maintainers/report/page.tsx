import type { Metadata } from 'next';

import { PrFeedbackScreen } from '../../components/pr-feedback-view';
import { orgAccessOf } from '@/lib/contribute/org-access';
import { prTargetOf } from '@/lib/contribute/pr-feedback';
import { loadPrReport } from '@/lib/contribute/pr-feedback.data';

export const metadata: Metadata = {
  title: 'Tell us how a PR went',
  description: 'Report a GitRanks pull request, or tell us it helped.',
};

/** A blocking route: it reads the visitor's role in the PR's repo before it shows the form for it. */
export const instant = false;

/**
 * Open to every visitor: one of our PRs, by its footer link (`?from=`) or by the PR (`?pr=owner/repo%23123`), and
 * `kind=helped` for "This PR helped". The form needs the page's GitHub sign-in; its token stays on the server.
 */
export default async function MaintainersReportPage({ searchParams }: PageProps<'/contribute/maintainers/report'>) {
  const { target, flow } = prTargetOf(await searchParams);
  const read = target ? await loadPrReport(target) : null;
  return (
    <PrFeedbackScreen
      target={target}
      flow={flow}
      read={read}
      orgAccessUrl={orgAccessOf(process.env.AUTH_GITHUB_BASIC_ID).url}
    />
  );
}
