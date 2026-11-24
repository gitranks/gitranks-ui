import type { Metadata } from 'next';

const NAME = /^[A-Za-z0-9_.-]+$/;

/**
 * A pull request page's tab title, from its own address: `owner/repo #issue`, which the address already shows. An
 * address of any other shape keeps the plain title.
 */
export function pullRequestTitleOf({ owner, repo, issue }: { owner: string; repo: string; issue: string }): string {
  return NAME.test(owner) && NAME.test(repo) && /^[1-9]\d{0,9}$/.test(issue)
    ? `${owner}/${repo} #${issue}`
    : 'A pull request';
}

/** The metadata of every page at a pull request's address: its title. */
export async function pullRequestMetadataOf(
  params: Promise<{ owner: string; repo: string; issue: string }>,
): Promise<Metadata> {
  return { title: pullRequestTitleOf(await params) };
}
