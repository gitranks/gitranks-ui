import { ContributeLedgerOpenDocument } from './ledger.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer of `contributeLedgerOpen` is reused: opening the ledger reaches every server within a minute. */
const OPEN_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const OPEN_RETRY_MS = 10_000;
let open: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/**
 * Whether the Contribute ledger is public (the API's `contributeLedgerOpen`, `CONTRIBUTE_LEDGER=public`; ledger design
 * §6). Asked once a minute per server, one ask at a time, as `contributeOpen` is. A failed ask keeps the last answer
 * (closed when there is none) and tries again 10 seconds later.
 */
export function contributeLedgerOpen(now = Date.now()): Promise<boolean> {
  if (open && now - open.at < OPEN_TTL_MS) return Promise.resolve(open.value);
  asking ??= askOpen(now).finally(() => {
    asking = null;
  });
  return asking;
}

async function askOpen(now: number): Promise<boolean> {
  try {
    const { contributeLedgerOpen: value } = await graphqlDirect(ContributeLedgerOpenDocument, undefined, {
      source: 'ssr',
    });
    open = { value: value === true, at: now };
  } catch {
    open = { value: open?.value ?? false, at: now - OPEN_TTL_MS + OPEN_RETRY_MS };
  }
  return open.value;
}

/** Forgets the cached answer (tests). */
export function resetContributeLedgerOpen(): void {
  open = null;
  asking = null;
}
