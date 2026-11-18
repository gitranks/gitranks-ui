import { parsePrLink } from '@/lib/contribute/pr-feedback';
import { prTimelineMarkdownOf } from '@/lib/contribute/pr-timeline-seo';
import { viewerPrTimeline } from '@/lib/contribute/pr-timeline-viewer.data';

const PRIVATE = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };

/** The Markdown twin before timelines are public: for the people the API names, by their session; never kept. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/pr-timeline-preview/[owner]/[repo]/[number]/timeline.md'>,
) {
  const { owner, repo, number } = await params;
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  const timeline = pr && String(pr.number) === number ? await viewerPrTimeline(pr).catch(() => null) : null;
  if (!timeline) {
    return new Response('Not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE },
    });
  }
  return new Response(prTimelineMarkdownOf(timeline), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...PRIVATE },
  });
}
