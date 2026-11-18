import type { PrTimeline } from './pr-timeline.types';
import { prTimelineMarkdownPath, prTimelinePath } from './pr-timeline-path';
import { dayHeadingOf, factsOf, fullDateOf, milestoneWordsOf, stateWordOf, timeOf } from './pr-timeline-words';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site';

const prOf = (timeline: PrTimeline) => ({ nameWithOwner: timeline.nameWithOwner, number: timeline.number });

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

/** The page's structured data: the page itself, its breadcrumbs, and the milestones as a list. */
export function prTimelineJsonLdOf(timeline: PrTimeline): unknown[] {
  const url = absoluteUrl(prTimelinePath(prOf(timeline)));
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
        { '@type': 'ListItem', position: 1, name: 'GitRanks Contribute', item: absoluteUrl('/contribute') },
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
      numberOfItems: timeline.milestones.length,
      itemListElement: timeline.milestones.map((row, at) => ({
        '@type': 'ListItem',
        position: at + 1,
        name: milestoneWordsOf(row, timeline).title,
        description: row.at,
      })),
    },
  ];
}

/** Markdown's own characters in the agent's or a title's text, escaped. */
const plain = (text: string) => text.replace(/([\\`*_[\]<>#|])/g, '\\$1');

/** The page as Markdown, for agents: the title, the facts, every milestone with its ISO time, and the links. */
export function prTimelineMarkdownOf(timeline: PrTimeline): string {
  const lines = [
    `# ${plain(timeline.title ?? `Pull request #${timeline.number}`)}`,
    '',
    `How [${timeline.nameWithOwner}#${timeline.number}](${timeline.url}) was made with GitRanks Contribute. ` +
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
