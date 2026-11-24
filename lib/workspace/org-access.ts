/** Where a user sees, and revokes, the OAuth Apps they allowed. */
export const GITHUB_APPS_URL = 'https://github.com/settings/applications';

/**
 * A write GitHub refused because the repository's organization only lets apps it approved act in its repositories, and
 * has not approved pull request access for Contribute. The organization's setting, not a fault on either side.
 */
export const ORG_RESTRICTED = 'org_restricted';

/**
 * Where the user asks an organization to approve the app: the app's own page on GitHub (`app`), where each organization
 * has a Request button, or the list of their apps when the app's id is not known here.
 */
export type OrgAccess = { url: string; app: boolean };

/** The app's id comes from the server's environment; read on the server, and handed to client components. */
export function orgAccessOf(clientId: string | undefined = process.env.AUTH_GITHUB_CONTRIBUTE_ID): OrgAccess {
  const id = clientId?.trim();
  return id && /^[\w.-]+$/.test(id)
    ? { url: `https://github.com/settings/connections/applications/${id}`, app: true }
    : { url: GITHUB_APPS_URL, app: false };
}
