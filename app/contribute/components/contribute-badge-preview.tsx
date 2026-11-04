import 'server-only';

import { findBadge } from '@/badge/v3/catalogue';
import type { RepoFacts } from '@/badge/v3/facts';
import { resolveParams } from '@/badge/v3/params';
import { renderBadge } from '@/badge/v3/render';

let drawn: Promise<string | null> | undefined;

/**
 * The "help welcome" badge as a README shows it, drawn the way its route draws it. The badge says the same for every
 * repository, so it is drawn once, for no repository in particular; its route is never called from here.
 */
function contributeBadgeSvg(): Promise<string | null> {
  drawn ??= (async () => {
    const badge = findBadge('repo', 'contribute');
    if (!badge) return null;
    const repo = { kind: 'repo', nameWithOwner: 'your-org/your-repo' } as RepoFacts;
    const { body } = await renderBadge(repo, badge, resolveParams(badge, {}), 'svg');
    return typeof body === 'string' ? body : null;
  })().catch(() => {
    drawn = undefined;
    return null;
  });
  return drawn;
}

/** The badge's image, or nothing when it could not be drawn: the Markdown beside it still says what it is. */
export async function ContributeBadgePreview() {
  const svg = await contributeBadgeSvg();
  if (!svg) return null;
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt="GitRanks Contribute: help welcome"
      className="h-5 w-auto"
    />
  );
}
