import { getRepoPath } from '@/utils/repo-paths';

// Snippets always point at production, also when copied from a preview.
const SITE_URL = 'https://gitranks.com';

/** The star history badge's path on this site. */
export const getStarHistoryBadgePath = (owner: string, name: string) =>
  `/repo-badges/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/star-history.svg`;

/** The embed snippets of a repository's star history badge, linking to its page. */
export function getStarHistoryBadgeSnippets(owner: string, name: string) {
  const imageUrl = `${SITE_URL}${getStarHistoryBadgePath(owner, name)}`;
  const pageUrl = `${SITE_URL}${getRepoPath(`${owner}/${name}`)}`;
  const alt = `Star history of ${owner}/${name}`;

  return {
    markdown: `[![${alt}](${imageUrl})](${pageUrl})`,
    html: `<a href="${pageUrl}"><img src="${imageUrl}" width="100%" alt="${alt}"></a>`,
  };
}
