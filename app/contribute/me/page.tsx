import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'My contributions' };

/** My contributions: totals, what needs the user, the PR table and credits per day arrive with the first attempts. */
export default function ContributeMine() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-3 px-4 pt-12 pb-16">
      <h1 className="text-[28px] font-bold tracking-tight">My contributions</h1>
      <p className="text-muted-foreground">
        Coming soon: your pull requests and how they did, what needs your review, and the credits each one used.
      </p>
      <Link href="/contribute/issues" prefetch={false} className="font-semibold text-primary">
        See the issues picked for you →
      </Link>
    </main>
  );
}
