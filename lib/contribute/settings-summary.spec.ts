import { describe, expect, it } from 'vitest';

import { resolve, smallReposSet, stackSet } from './__fixtures__/contribute-sets';
import { movedAnchorOf, settingsPathOf, switchModeOf, switchPathOf } from './settings-paths';
import {
  keptListOf,
  listSummaryOf,
  ownAgentSummaryOf,
  preferencesSummaryOf,
  waitingLibrariesOf,
} from './settings-summary';

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
    expect(movedAnchorOf('modes')).toBeNull();
    expect(settingsPathOf('work')).toBe('/contribute/settings#work');
    expect(movedAnchorOf('autopilot')).toBeNull();
    expect(movedAnchorOf('constructor')).toBeNull();
    expect(settingsPathOf('danger')).toBe('/contribute/settings#danger');
  });
});

describe('what you work on, in short', () => {
  it('names each switch page by its mode, and reads the mode back', () => {
    expect(switchPathOf('STACK')).toBe('/contribute/settings/switch/stack');
    expect(switchPathOf('REPOS')).toBe('/contribute/settings/switch/repos');
    expect(switchModeOf('stack')).toBe('STACK');
    expect(switchModeOf('repos')).toBe('REPOS');
    expect(switchModeOf('all')).toBeNull();
    expect(switchModeOf('STACK')).toBeNull();
  });

  it('says the stack is worked out while it is, and that none was found once it was', () => {
    const fresh = stackSet({ stack: { ...stackSet().stack, resolve: null } });
    expect(listSummaryOf(fresh)).toBe('Working out your libraries from 3 repos · all issues until then');
    expect(waitingLibrariesOf(fresh)).toContain('Until then, your agent works on all issues.');

    const none = stackSet({ stack: { ...stackSet().stack, resolve: resolve({ targets: [] }) } });
    expect(listSummaryOf(none)).toBe('No libraries found in 3 repos · all issues meanwhile');
    expect(waitingLibrariesOf(none)).toContain('We found no libraries we can work on');

    expect(waitingLibrariesOf(stackSet())).toBeNull();
    expect(listSummaryOf(stackSet())).toBe('50 libraries from 3 repos · then all issues');
  });

  it('says what a switch keeps', () => {
    expect(keptListOf(stackSet())).toBe('Your stack (3 repos) stays saved: switch back any time.');
    expect(keptListOf(smallReposSet())).toBe('Your repos list (12 repos) stays saved: switch back any time.');
    expect(keptListOf(stackSet({ mode: 'ALL' }))).toBeNull();
  });
});
