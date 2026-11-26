import { notFound, redirect } from 'next/navigation';

import type { ContributeSetupState } from './contribute.types';

/**
 * A Contribute page with no view for the viewer (`state`: `loadContributeSetupState()`): while their account is being
 * set up, or for a company-managed account, Contribute's home, which says so; otherwise not found.
 */
export function contributeHidden(state: ContributeSetupState): never {
  if (state === 'setting-up' || state === 'managed') redirect('/contribute');
  notFound();
}
