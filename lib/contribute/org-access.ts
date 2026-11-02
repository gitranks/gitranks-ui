import { githubUrlOf } from './attempt-format';
import type { ContributeReplyDraft } from './contribute.types';
import { replyPreviewOf } from './follow-up-flow';

/** Where a user sees, and revokes, the OAuth Apps they allowed. */
export const GITHUB_APPS_URL = 'https://github.com/settings/applications';

/**
 * A write GitHub refused because the repository's organization only lets apps it approved act in its repositories, and
 * has not approved pull request access for Contribute. The organization's setting, not a fault on either side.
 */
export const ORG_RESTRICTED = 'org_restricted';

export const isOrgRestricted = (reason: string | null | undefined): boolean => reason === ORG_RESTRICTED;

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

/**
 * A reply's words as they would go on GitHub, to post by hand, and whether they can be copied yet. `body` is what an
 * approval would post now (the repo's mark, the prefix with its commit) or, once sent, what was sent; with none, the
 * prefix and the text as the page shows them. A prefix still waiting for its commit ("Fixed in <commit>: ") is not
 * what GitHub would get, so it is not to copy until the commits are on the pull request. `text`: the words as the user
 * edits them, which `body` no longer is once they differ.
 */
export function replyCopyOf(
  draft: Pick<ContributeReplyDraft, 'state' | 'text' | 'prefix' | 'body'>,
  text: string = draft.text,
): { words: string; copyable: boolean } {
  const body = draft.body?.trim() ? draft.body : null;
  if (draft.state === 'POSTED') return { words: body ?? draft.text, copyable: true };
  if (body && text === draft.text) return { words: body, copyable: true };
  return { words: replyPreviewOf(draft.prefix, text), copyable: !(draft.prefix ?? '').includes('<commit>') };
}

/** Where to paste a reply that is not posted: its review thread, or the pull request's conversation. */
export function replyLinkOf(
  draft: Pick<ContributeReplyDraft, 'state' | 'comment' | 'commentUrl'>,
): { href: string; label: string } | null {
  const href = draft.state === 'POSTED' ? null : githubUrlOf(draft.commentUrl);
  if (!href) return null;
  return {
    href,
    label: draft.comment ? 'Open the thread on GitHub ↗' : 'Open the pull request on GitHub ↗',
  };
}
