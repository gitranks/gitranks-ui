import { MorePages, type PublicPage } from './public-pages';
import { contributeShown } from '@/lib/contribute/preview-gate';

/** The other pages about Contribute, for whoever may see them: the preview list, everyone once launched. */
export async function LaunchedMorePages({ current = 'maintainers' }: { current?: PublicPage }) {
  return (await contributeShown()) ? <MorePages current={current} /> : null;
}
