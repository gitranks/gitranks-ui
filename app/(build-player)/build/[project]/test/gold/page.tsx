import type { Metadata } from 'next';

import { BuildTestPage, buildTestMetadata } from '@/components/build/test/build-test-page';

/**
 * The gold test, a week after a build is Built: 10 questions, 8 right earns the gold mark. Only the person's own, read
 * in the browser; never indexed.
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/build/[project]/test/gold'>): Promise<Metadata> {
  return buildTestMetadata(params, 'gold');
}

export default function BuildGoldTestPage({ params, searchParams }: PageProps<'/build/[project]/test/gold'>) {
  return <BuildTestPage params={params} searchParams={searchParams} kind="gold" />;
}
