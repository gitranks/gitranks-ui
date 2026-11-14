import { notFound, redirect } from 'next/navigation';

/**
 * A Contribute page with no view for the viewer (`settingUp`: `loadContributeSetup()`): while their account is being
 * set up, Contribute's home, which says so; otherwise not found.
 */
export function contributeHidden(settingUp: boolean): never {
  if (settingUp) redirect('/contribute');
  notFound();
}
