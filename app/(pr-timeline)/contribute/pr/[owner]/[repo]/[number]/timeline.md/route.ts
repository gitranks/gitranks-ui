import { publicPrTimeline } from '@/lib/contribute/pr-timeline.data';
import { prTimelineMarkdownOf } from '@/lib/contribute/pr-timeline-seo';
import { parsePrLink } from '@/lib/workspace/pr-feedback';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/**
 * A pull request timeline as Markdown, for agents: only at this address (the page's own answers HTML to everyone). The
 * proxy has asked the API first, as for the page; a shown one is the same for everyone and kept by shared caches, a
 * page without its reviews for a minute only.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/contribute/pr/[owner]/[repo]/[number]/timeline.md'>,
) {
  const { owner, repo, number } = await params;
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  const timeline = pr && String(pr.number) === number ? await publicPrTimeline(pr) : null;
  if (!timeline) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }
  return new Response(prTimelineMarkdownOf(timeline), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': timeline.partial ? 'public, max-age=60, s-maxage=60' : 'public, max-age=60, s-maxage=120',
      Link: `<${prTimelinePath(timeline)}>; rel="canonical"`,
    },
  });
}
