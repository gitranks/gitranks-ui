import type { Metadata } from 'next';

import { PRIVACY_COPY as COPY } from '@/app/profile/[login]/privacy/components/privacy-copy';
import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Data removed', robots: { index: false, follow: false } };

/** Where a removal lands after the sign-out. */
export default function DataRemoved() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-6 pb-16 md:pt-12">
        <h1 className="text-2xl font-semibold">{COPY.removedTitle}</h1>
        <p>
          {COPY.removedText} <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>
        </p>
        <p className="text-sm text-muted-foreground">
          What stays, and why: <Link href="/privacy#removal">Privacy policy</Link>.
        </p>
      </main>
    </>
  );
}
