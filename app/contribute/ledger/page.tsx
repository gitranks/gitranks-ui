import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LedgerScreen } from '../components/ledger-view';
import { LEDGER_PATH } from '@/lib/contribute/contribute-path';
import { loadLedger } from '@/lib/contribute/ledger.data';
import { pageMetadata } from '@/lib/seo/page-metadata';

const TITLE = 'Contribute ledger';

/**
 * A blocking route: it reads the session (the list needs the login), and a hidden ledger must answer a real 404, not a
 * 200 shell streaming one.
 */
export const instant = false;

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
  return { ...pageMetadata({ title: TITLE, description, path: LEDGER_PATH }), robots: { index: true, follow: true } };
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
