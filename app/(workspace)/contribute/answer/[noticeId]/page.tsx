import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FairUseAnswerView } from '@/app/(workspace)/contribute/components/fair-use-answer-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'A message from GitRanks', robots: { index: false, follow: false } };

type Params = PageProps<'/contribute/answer/[noticeId]'>;

/**
 * A message from GitRanks about how the user uses Contribute, and their answer to it: the page its banner, its email and
 * the user's agent link. Signed out, it asks the visitor to sign in and comes back here; only the message's own user
 * sees it, and a message the API does not answer for the signed-in user is not found. Not indexed.
 */
export default function FairUseAnswerPage({ params }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <AnswerView params={params} />
      </Suspense>
    </main>
  );
}

async function AnswerView({ params }: Pick<Params, 'params'>) {
  return <FairUseAnswerView noticeId={(await params).noticeId} />;
}
