import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site';
import type { PrTimeline } from '@/lib/workspace/pr-timeline.types';
import { madeRowsOf } from '@/lib/workspace/pr-timeline-made';
import { prTimelineMarkdownPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';
import {
  dayHeadingOf,
  factsOf,
  fullDateOf,
  milestoneWordsOf,
  stateWordOf,
  timeOf,
} from '@/lib/workspace/pr-timeline-words';

const prOf = (timeline: PrTimeline) => ({ nameWithOwner: timeline.nameWithOwner, number: timeline.number });

/** How the pull request was made: with GitRanks Learn, or with GitRanks Contribute. */
export type PrTimelineMade = 'LEARN' | 'CONTRIBUTE';

/** The product a pull request was made with, by name, and its home: the breadcrumbs' first step. */
const productOf = (made: PrTimelineMade) =>
  made === 'LEARN' ? { name: 'GitRanks Learn', path: '/learn' } : { name: 'GitRanks Contribute', path: '/contribute' };

/** "<title> · owner/repo#n": the page's title, the search result's line. */
export const prTimelineTitleOf = (timeline: PrTimeline) =>
  `${timeline.title ?? `Pull request #${timeline.number}`} · ${timeline.nameWithOwner}#${timeline.number}`;

/** One sentence of facts, then what the page is. */
export function prTimelineDescriptionOf(timeline: PrTimeline): string {
  const who = timeline.contributorLogin ? ` by ${timeline.contributorLogin}` : '';
  return (
    `Opened ${fullDateOf(timeline.openedAt)}${who} with ${timeline.agentPhrase}. ${stateWordOf(timeline.state)}. ` +
    'How it was made, step by step.'
  );
}

/**
 * The page's structured data: the page itself, its breadcrumbs from the product it was made with (`made`), and the
 * rows the page lists (with `questions`, the walkthrough's row counts them).
 */
export function prTimelineJsonLdOf(
  timeline: PrTimeline,
  { made = 'CONTRIBUTE', questions = null }: { made?: PrTimelineMade; questions?: number | null } = {},
): unknown[] {
  const url = absoluteUrl(prTimelinePath(prOf(timeline)));
  const product = productOf(made);
  const rows = madeRowsOf(timeline, { questions });
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': url,
      url,
      name: prTimelineTitleOf(timeline),
      description: prTimelineDescriptionOf(timeline),
      dateCreated: timeline.openedAt,
      dateModified: timeline.modifiedAt,
      publisher: { '@id': ORGANIZATION_ID },
      about: {
        '@type': 'SoftwareSourceCode',
        name: timeline.nameWithOwner,
        codeRepository: `https://github.com/${timeline.nameWithOwner}`,
      },
      isBasedOn: timeline.url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: product.name, item: absoluteUrl(product.path) },
        {
          '@type': 'ListItem',
          position: 2,
          name: timeline.nameWithOwner,
          item: `https://github.com/${timeline.nameWithOwner}`,
        },
        { '@type': 'ListItem', position: 3, name: `#${timeline.number}`, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'How this pull request was made',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: rows.length,
      itemListElement: rows.map((row, at) => ({
        '@type': 'ListItem',
        position: at + 1,
        name: row.label,
        description: row.text,
      })),
    },
  ];
}

/** Markdown's own characters in the agent's or a title's text, escaped. */
const plain = (text: string) => text.replace(/([\\`*_[\]<>#|])/g, '\\$1');

/**
 * The page as Markdown, for agents: the title, the facts, every milestone with its ISO time, and the links. A Learn
 * fix's copy (`made`) names Learn and carries its own part (`learn`, Markdown lines from the page that knows it)
 * before the links, so one copy covers both views of the fix.
 */
export function prTimelineMarkdownOf(
  timeline: PrTimeline,
  { learn = null, made = 'CONTRIBUTE' }: { learn?: readonly string[] | null; made?: PrTimelineMade } = {},
): string {
  const product = productOf(made).name;
  const lines = [
    `# ${plain(timeline.title ?? `Pull request #${timeline.number}`)}`,
    '',
    `How [${timeline.nameWithOwner}#${timeline.number}](${timeline.url}) was made with ${product}. ` +
      `${stateWordOf(timeline.state)}. Fixes [issue #${timeline.issue.number}](${timeline.issue.url}).`,
    '',
    '## Facts',
    '',
    ...factsOf(timeline).map((fact) => `- ${fact.label}: ${fact.value}${fact.note ? ` (${fact.note})` : ''}`),
    `- Opened by: ${timeline.contributorLogin ?? 'the contributor'}${timeline.reviewed ? ', who reviewed and submitted it' : '’s autopilot, not reviewed by a person'}`,
    `- The change: ${timeline.change.files} files, +${timeline.change.added} −${timeline.change.removed}, ${timeline.change.commits} commits, ${timeline.change.testsAdded} tests added (counted by GitRanks)`,
    `- People who said it helped: ${timeline.helped}`,
    '',
    '## Timeline (UTC)',
    '',
  ];
  let day = '';
  for (const row of timeline.milestones) {
    const heading = dayHeadingOf(row.at);
    if (heading !== day) {
      day = heading;
      lines.push(`### ${heading}`, '');
    }
    const words = milestoneWordsOf(row, timeline);
    const when = row.dayOnly ? row.at.slice(0, 10) : `${row.at} (${timeOf(row.at)})`;
    const who = words.actor ? ` · ${words.actor}` : '';
    lines.push(`- ${when}: ${plain(words.title)}${who}`);
    if (words.text) lines.push(`  ${plain(words.text)}`);
    if (words.pills.length) lines.push(`  ${words.pills.join(', ')}`);
  }
  if (learn?.length) lines.push('', ...learn);
  lines.push(
    '',
    '## Links',
    '',
    `- [The pull request on GitHub](${timeline.url})`,
    `- [This page](${absoluteUrl(prTimelinePath(prOf(timeline)))})`,
    `- [This page as Markdown](${absoluteUrl(prTimelineMarkdownPath(prOf(timeline)))})`,
    `- [For maintainers](${absoluteUrl(`/contribute/maintainers?from=${timeline.attemptId}`)})`,
    '',
    'GitRanks made this page from the record of the work. The contributor’s own conversation with their agent is never shown.',
    '',
  );
  return lines.join('\n');
}
