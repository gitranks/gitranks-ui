import { describe, expect, it } from 'vitest';

import {
  prTimelineDescriptionOf,
  prTimelineJsonLdOf,
  prTimelineMarkdownOf,
  prTimelineTitleOf,
} from './pr-timeline-seo';
import {
  autopilotTimeline,
  learnTimeline,
  mergedTimeline,
  unknownKindTimeline,
} from '@/lib/workspace/__fixtures__/pr-timeline';
import { madeRowsOf } from '@/lib/workspace/pr-timeline-made';

describe('the PR timeline for search engines and agents', () => {
  it('titles and describes the page from its facts', () => {
    expect(prTimelineTitleOf(mergedTimeline)).toBe(
      'Normalize route paths before the layout cache lookup · driftwood-js/driftwood#1419',
    );
    expect(prTimelineDescriptionOf(mergedTimeline)).toBe(
      'Opened Oct 24, 2026 by mira-dev with Claude (Opus). Merged. How it was made, step by step.',
    );
  });

  it('describes the page, its breadcrumbs and its milestones as structured data', () => {
    const [page, crumbs, list] = prTimelineJsonLdOf(mergedTimeline) as Record<string, unknown>[];
    expect(page).toMatchObject({
      '@type': 'WebPage',
      dateCreated: mergedTimeline.openedAt,
      dateModified: mergedTimeline.modifiedAt,
      about: { name: 'driftwood-js/driftwood' },
    });
    expect(crumbs).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [{ name: 'GitRanks Contribute', item: expect.stringMatching(/\/contribute$/) }, {}, {}],
    });
    // The rows the page lists, in its words.
    const rows = madeRowsOf(mergedTimeline);
    expect(list).toMatchObject({ '@type': 'ItemList', numberOfItems: rows.length });
    expect((list.itemListElement as { name: string; description: string }[])[0]).toMatchObject({
      name: 'Fix',
      description: rows[0].text,
    });
  });

  it("names Learn in a Learn fix's breadcrumbs and Markdown, and counts its walkthrough's questions", () => {
    const [, crumbs, list] = prTimelineJsonLdOf(learnTimeline, { made: 'LEARN', questions: 4 }) as Record<
      string,
      unknown
    >[];
    expect(crumbs).toMatchObject({
      itemListElement: [{ name: 'GitRanks Learn', item: expect.stringMatching(/\/learn$/) }, {}, {}],
    });
    expect(JSON.stringify(list)).toContain('mira-dev answered 4 questions about the change.');
    expect(JSON.stringify(prTimelineJsonLdOf(learnTimeline, { made: 'LEARN' }))).not.toContain('Contribute');
    expect(prTimelineMarkdownOf(learnTimeline, { made: 'LEARN' })).toContain('was made with GitRanks Learn.');
    expect(prTimelineMarkdownOf(learnTimeline)).toContain('was made with GitRanks Contribute.');
  });

  it('writes every milestone with its ISO time in the Markdown twin, and the links', () => {
    const markdown = prTimelineMarkdownOf(mergedTimeline);
    for (const row of mergedTimeline.milestones) expect(markdown).toContain(row.at);
    expect(markdown).toContain('### Sat, Oct 24');
    expect(markdown).toContain('Wrote the fix · Agent');
    expect(markdown).toContain(`[The pull request on GitHub](${mergedTimeline.url})`);
    expect(markdown).toContain('/contribute/pr/driftwood-js/driftwood/1419/timeline.md');
    expect(prTimelineMarkdownOf(autopilotTimeline)).toContain('autopilot, not reviewed by a person');
  });

  it('writes a row of a kind it does not know as a plain row, in the Markdown twin and the structured data', () => {
    const markdown = prTimelineMarkdownOf(unknownKindTimeline);
    expect(markdown).toContain('Another step · Agent');
    expect(markdown).not.toContain('Wrote a walkthrough of the fix.');
    const [, , list] = prTimelineJsonLdOf(unknownKindTimeline) as Record<string, unknown>[];
    expect(list).toMatchObject({ numberOfItems: madeRowsOf(unknownKindTimeline).length });
  });

  it('escapes Markdown in the agent’s words', () => {
    const timeline = {
      ...mergedTimeline,
      milestones: [{ ...mergedTimeline.milestones[2], text: 'Fixed [a](javascript:x) *bold* `code`' }],
    };
    expect(prTimelineMarkdownOf(timeline)).toContain('Fixed \\[a\\](javascript:x) \\*bold\\* \\`code\\`');
  });
});
