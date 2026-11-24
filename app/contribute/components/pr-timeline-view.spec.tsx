import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PrTimelineScreen } from './pr-timeline-view';
import {
  mergedTimeline,
  openTimeline,
  ownAgentTimeline,
  stoppedTimeline,
  unknownKindTimeline,
} from '@/lib/contribute/__fixtures__/pr-timeline';

const html = (timeline = mergedTimeline) => renderToStaticMarkup(<PrTimelineScreen timeline={timeline} />);
const text = (timeline = mergedTimeline) =>
  html(timeline)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

describe('PrTimelineScreen', () => {
  it('draws the head, the facts, the rows by UTC day and the cards', () => {
    const page = text();
    for (const words of [
      'How this pull request was made',
      'Normalize route paths before the layout cache lookup',
      'Merged',
      'opened Oct 24 by mira-dev, who reviewed and submitted it',
      'issue #871',
      'Agent work 53 min 2 runs',
      'Sat, Oct 24',
      'Sun, Oct 25',
      'Mon, Oct 26',
      'Wrote the fix',
      'tomas-r asked for changes',
      '4 people said it helped',
      'Times are in UTC.',
      'never shown',
    ]) {
      expect(page).toContain(words);
    }
    // The last row's dot is filled; one feedback card.
    expect(html()).toContain('data-who="end"');
    expect(html().match(/Was this pull request useful\?/g)).toHaveLength(1);
  });

  it('links the feedback to the report page by the PR’s attempt id, and the diff to GitHub', () => {
    const page = html();
    expect(page).toContain(`/contribute/maintainers/report?from=${mergedTimeline.attemptId}&amp;kind=helped`);
    expect(page).toContain(`/contribute/maintainers/report?from=${mergedTimeline.attemptId}"`);
    expect(page).toContain(`${mergedTimeline.url}/files`);
  });

  it('an open PR with no helped notes; a stopped one; the contributor’s own agent', () => {
    expect(text(openTimeline)).not.toContain('said it helped');
    expect(text(openTimeline)).toContain('Since Oct 24');
    expect(text(stoppedTimeline)).toContain('A maintainer stopped GitRanks work on this pull request.');
    expect(text(ownAgentTimeline)).toContain('the contributor’s own agent');
    expect(text(ownAgentTimeline)).toContain('after 3 tries');
  });

  it('draws a row of a kind it does not know as a plain row, and every other row as before', () => {
    const page = html(unknownKindTimeline);
    const row = /<li[^>]*data-kind="walkthrough"[^>]*>.*?<\/li>/s.exec(page)?.[0] ?? '';
    expect(row).toContain('14:40');
    expect(row).toContain('Another step');
    expect(row).toContain('data-who="agent"');
    expect(row).not.toContain('Wrote a walkthrough of the fix.');
    expect(row).not.toContain('4 min');
    // The merge still ends the timeline with the filled dot; the rest is the same page.
    expect(page.match(/data-who="end"/g)).toHaveLength(1);
    for (const words of ['Wrote the fix', 'tomas-r asked for changes', 'Agent work 53 min 2 runs']) {
      expect(text(unknownKindTimeline)).toContain(words);
    }
  });
});
