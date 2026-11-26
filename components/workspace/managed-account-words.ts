/** Which side's page a panel stands on: its eyebrow names it. */
export type SetupProduct = 'Contribute' | 'Learn';

export const MANAGED_ACCOUNT_TITLE = "This GitHub account can't be used";
/** What a company-managed account reads: why, and what to do instead. */
export const managedAccountText = (product: SetupProduct) =>
  `You signed in with a company-managed GitHub account. These accounts can't open pull requests on public projects, so ${product} can't work with it. Sign out, then sign in with your personal GitHub account.`;
