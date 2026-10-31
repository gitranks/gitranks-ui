/**
 * The GitHub logins that see the modes (support my stack, support these repos) before they open to everyone. Everyone
 * else keeps Contribute as it is: no mode section, no mode switch, and the modes' actions refuse.
 */
const MODES_PREVIEW_LOGINS: readonly string[] = ['maslianok'];

/** Whether this GitHub login sees the modes. GitHub logins are case-insensitive. */
export function contributeModesShown(githubLogin: string | null | undefined): boolean {
  if (!githubLogin) return false;
  const login = githubLogin.toLowerCase();
  return MODES_PREVIEW_LOGINS.some((allowed) => allowed.toLowerCase() === login);
}
