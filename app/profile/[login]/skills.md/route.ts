import { connection } from 'next/server';

import { fetchLearnForVisitors } from '@/app/components/landing/landing-data';
import { skillsPath } from '@/lib/skills/paths';
import { loadSkillsPage } from '@/lib/skills/skills.data';
import { skillsMarkdownOf } from '@/lib/skills/skills-markdown';
import { isGithubLogin } from '@/utils/profile-refresh';

const NOT_KEPT = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' };

/**
 * A Skills page's Markdown copy, for agents: what the page shows everyone, read through the page's own cached read.
 * Not found wherever the page is (nothing to show, hidden, not known), never kept; a failed read says so for a minute.
 */
export async function GET(_request: Request, { params }: RouteContext<'/profile/[login]/skills.md'>) {
  await connection();
  const { login } = await params;
  if (!isGithubLogin(login)) return new Response('Not found.\n', { status: 404, headers: NOT_KEPT });
  const [skills, learnOpen] = await Promise.all([loadSkillsPage(login), fetchLearnForVisitors()]);
  if (skills.failed) {
    return new Response('This Skills page cannot be read right now. Try again in a minute.\n', {
      status: 503,
      headers: { ...NOT_KEPT, 'Retry-After': '60' },
    });
  }
  if (!skills.value) return new Response('Not found.\n', { status: 404, headers: NOT_KEPT });
  return new Response(skillsMarkdownOf(skills.value, { learnOpen, now: new Date() }), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'X-Content-Type-Options': 'nosniff',
      // The page itself is indexed (once it may be); this is its copy for agents.
      'X-Robots-Tag': 'noindex',
      Link: `<${skillsPath(skills.value.login)}>; rel="canonical"`,
    },
  });
}
