import type { Metadata } from 'next';

import { PublicProgressView } from '@/components/learn/progress/public-progress-view';
import { isStoredSpelling } from '@/lib/learn/public-progress/public-progress';
import { loadPublicRecord } from '@/lib/learn/public-progress/public-progress.data';
import { publicProgressMetadataOf } from '@/lib/learn/public-progress/public-progress-seo';

/**
 * The page is the same for everyone, and not cached here. It streams, so its own notFound() reaches the browser with a
 * 200: a login with no public record, or another spelling of it, gets its real 404 from the proxy, which asks first
 * (`lib/learn/public-progress/progress-gate.ts`).
 */
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/learn/progress/[login]'>): Promise<Metadata> {
  const { login } = await params;
  let record = null;
  try {
    record = await loadPublicRecord(login);
  } catch {
    // The page says it is not available; its preview is left without the card.
  }
  return publicProgressMetadataOf(login, record && isStoredSpelling(record, login) ? record : null);
}

/** A person's public progress page: what they learned on real open-source fixes. Open to every visitor. */
export default async function PublicProgressPage({ params, searchParams }: PageProps<'/learn/progress/[login]'>) {
  const { login } = await params;
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16">
      <PublicProgressView login={login} searchParams={searchParams} />
    </main>
  );
}
