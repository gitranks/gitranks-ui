/**
 * A GitHub account's avatar as this site serves it, by login: a developer's, an organization's or a repository
 * owner's. Pages draw it from here, and their structured data and link previews name the same URL.
 */
export const avatarPath = (login: string) => `/api/avatar/${encodeURIComponent(login)}`;

/** "Linus Torvalds (@torvalds)", or "@torvalds" without a name of its own. */
const accountName = (login: string, name?: string | null) =>
  name && name !== login ? `${name} (@${login})` : `@${login}`;

/** The alt text and caption of a developer's avatar: "GitHub avatar of Linus Torvalds (@torvalds)". */
export const userAvatarAlt = (login: string, name?: string | null) => `GitHub avatar of ${accountName(login, name)}`;

/** The alt text and caption of an organization's avatar: "GitHub logo of Vercel (@vercel)". */
export const orgAvatarAlt = (login: string, name?: string | null) => `GitHub logo of ${accountName(login, name)}`;

/** The alt text and caption of a repository owner's avatar: "GitHub avatar of torvalds, owner of torvalds/linux". */
export const repoOwnerAvatarAlt = (owner: string, nameWithOwner: string) =>
  `GitHub avatar of ${owner}, owner of ${nameWithOwner}`;
