import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LedgerScreen } from '../components/ledger-view';
import { loadLedger } from '@/lib/contribute/ledger.data';

const TITLE = 'Contribute ledger';

/**
 * Indexed only once the ledger is public (no `preview`): until then the Contribute layout's `noindex` stands, and a
 * visitor the API hides it from gets the 404 the page answers.
 */
export async function generateMetadata(): Promise<Metadata> {
  const ledger = await loadLedger().catch(() => null);
  if (!ledger || ledger.preview) return { title: TITLE };
  const { opened, merged, mergeRate } = ledger.totals;
  const description =
    `${opened.toLocaleString('en-US')} pull requests opened with GitRanks Contribute in other people’s repositories, ` +
    `${merged.toLocaleString('en-US')} merged` +
    (mergeRate === null ? '' : `, a ${Math.round(mergeRate * 100)}% merge rate`) +
    '. Every one listed with how it ended, closed ones included.';
  return {
    title: TITLE,
    description,
    robots: { index: true, follow: true },
    openGraph: { title: TITLE, description },
  };
}

/**
 * The Contribute ledger (ledger design 2026-11-03): behind `CONTRIBUTE_LEDGER`, not the Contribute preview. The proxy
 * keeps signed-out visitors out while it is closed; the API decides for the rest.
 */
export default async function LedgerPage() {
  const ledger = await loadLedger();
  if (!ledger) notFound();
  return <LedgerScreen ledger={ledger} />;
}
