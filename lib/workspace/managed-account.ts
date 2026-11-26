/**
 * Whether a GitHub login is a company-managed account's (GitHub Enterprise Managed Users). Its login is the person's
 * handle, an underscore and the company's short code, and a personal login can never hold an underscore. Such an
 * account can't open pull requests on public projects, so neither Contribute nor Learn can work with it: the person
 * signs in with their personal account instead.
 */
export const isManagedLogin = (login: string): boolean => login.includes('_');
