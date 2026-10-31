import { describe, expect, it } from 'vitest';

import { movedAnchorOf, settingsPathOf } from './settings-paths';
import { ownAgentSummaryOf, preferencesSummaryOf } from './settings-summary';

describe('the Settings summary', () => {
  it('says the preferences in short, naming three languages and counting the rest', () => {
    expect(preferencesSummaryOf(null)).toBe('Every language · every kind of issue · any size');
    expect(
      preferencesSummaryOf({
        languages: ['RUST', 'GO', 'PYTHON', 'JAVA', 'JS_TS'],
        topicIds: [],
        kinds: ['BUG', 'DOCS'],
        maxSize: 'M',
      }),
    ).toMatch(/^Rust, Go, Python \+2 · Bugs, Docs · up to medium$/);
  });

  it('says how many tokens and when one was last used', () => {
    const now = new Date('2026-10-31T12:00:00.000Z');
    const token = { id: 't', name: 'laptop', last4: 'ab12', createdAt: '2026-10-01T00:00:00.000Z' };
    expect(ownAgentSummaryOf(undefined)).toBe('Not available yet. It is coming soon.');
    expect(ownAgentSummaryOf({ paths: { mcp: true } as never, tokens: [] })).toBe('No token yet');
    expect(
      ownAgentSummaryOf(
        {
          paths: { mcp: true } as never,
          tokens: [
            { ...token, lastUsedAt: '2026-10-31T09:00:00.000Z' },
            { ...token, id: 'u', lastUsedAt: null },
          ],
        },
        now,
      ),
    ).toBe('2 tokens · last used 3 hours ago');
  });
});

describe('the Settings pages', () => {
  it('sends each old section anchor to the page it is on now, and keeps the rest on the summary', () => {
    expect(movedAnchorOf('limits')).toBe('/contribute/settings/budget');
    expect(movedAnchorOf('prs')).toBe('/contribute/settings/agent#prs');
    expect(movedAnchorOf('access')).toBe('/contribute/settings/keys');
    expect(movedAnchorOf('own-agent')).toBe('/contribute/settings/own-agent');
    expect(movedAnchorOf('modes')).toBe('/contribute/settings/work');
    expect(movedAnchorOf('autopilot')).toBeNull();
    expect(movedAnchorOf('constructor')).toBeNull();
    expect(settingsPathOf('danger')).toBe('/contribute/settings#danger');
  });
});
