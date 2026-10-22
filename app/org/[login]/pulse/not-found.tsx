'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Page } from '@/components/page/page';

// An org outside Pulse, or one that doesn't exist: either way this page has nothing to show. The
// org's own page says which.
export default function OrgPulseNotFound() {
  const { login } = useParams<{ login: string }>();

  return (
    <Page className="items-center justify-center gap-4 py-16 text-center">
      <p className="text-2xl md:text-4xl font-semibold">404: No Pulse page for this organization</p>
      <Link href={`/org/${login}` as Route} prefetch={false} className="text-link underline-offset-4 hover:underline">
        Open the organization&apos;s page
      </Link>
    </Page>
  );
}
