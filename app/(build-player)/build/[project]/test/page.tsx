import type { Metadata } from 'next';

import { BuildTestPage, buildTestMetadata } from '@/components/build/test/build-test-page';

/**
 * The test at the end of a project: 10 questions, 7 right makes the build Built. Only the person's own, read in the
 * browser; never indexed.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/build/[project]/test'>): Promise<Metadata> {
  return buildTestMetadata(params, 'end');
}

export default function BuildEndTestPage({ params, searchParams }: PageProps<'/build/[project]/test'>) {
  return <BuildTestPage params={params} searchParams={searchParams} kind="end" />;
}
