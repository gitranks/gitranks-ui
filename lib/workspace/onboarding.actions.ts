'use server';

import { run } from './action-run';
import { MarkContributeOnboardedDocument } from './contribute.documents';
import type { ContributeActionResult } from './errors';

/**
 * Sets the Contribute sign once, as the session's user: true when it is set (now, or before), false when no agent of
 * theirs is connected and nothing was set. Called from the browser only, by the second step of Contribute's flow once
 * it is drawn: never while a page renders and never on a prefetch.
 */
export async function markContributeOnboarded(): Promise<ContributeActionResult<boolean>> {
  return run(MarkContributeOnboardedDocument, undefined, (data) => data.markContributeOnboarded === true);
}
