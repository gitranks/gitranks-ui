'use server';

import { run } from './action-run';
import { RetryContributeSetupDocument } from './contribute.documents';
import type { ContributeSetupState } from './contribute.types';
import type { ContributeActionResult } from './errors';
import { setupStateOf } from './setup-state';

/**
 * "Try again" on the panel of a failed setup, as the session's user: asks the account's first read again, and answers
 * the state after (`setting-up` when it is on its way; `failed` when it is too soon or could not start). Never starts
 * a second read while one is on its way: the API decides. Called from the browser only.
 */
export async function retryContributeSetup(): Promise<ContributeActionResult<ContributeSetupState>> {
  return run(RetryContributeSetupDocument, undefined, (data) => setupStateOf(data.retryContributeSetup) ?? 'failed');
}
