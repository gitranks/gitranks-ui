import { LearnRecordDocument } from '../learn.documents';
import { learnRecordOf } from '../learn-promo';
import { isStoredSpelling } from './public-progress';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A person's public progress page streams, as a shared lesson's does, so its own notFound() reaches the browser only
 * after a 200. The proxy asks for the record first: none, or a login asked under another spelling than the one stored,
 * gets a real 404 before anything renders.
 */

/** How long the proxy waits for the answer before leaving it to the page. */
export const PROGRESS_GATE_TIMEOUT_MS = 2000;

/** `missing`: the 404. `page`: the page reads it (a failed or slow ask too: the page then says it is not available). */
export type ProgressGate = 'page' | 'missing';

async function askGate(login: string): Promise<ProgressGate> {
  try {
    const { learnRecord } = await graphqlDirect(LearnRecordDocument, { login }, { source: 'ssr' });
    const record = learnRecordOf(learnRecord);
    return record && isStoredSpelling(record, login) ? 'page' : 'missing';
  } catch {
    return 'page';
  }
}

export async function progressGateOf(login: string, timeoutMs = PROGRESS_GATE_TIMEOUT_MS): Promise<ProgressGate> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<ProgressGate>((resolve) => {
    timer = setTimeout(() => resolve('page'), timeoutMs);
  });
  try {
    return await Promise.race([askGate(login), late]);
  } finally {
    clearTimeout(timer);
  }
}
