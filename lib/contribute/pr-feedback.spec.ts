import { describe, expect, it } from 'vitest';

import { maintainerFacts, prCard } from './__fixtures__/maintainers';
import { prFeedbackErrorMessage, prFeedbackErrorOf } from './errors';
import { configAbilitiesOf, configExampleOf, contributeBadgeMarkdown, liveKeysOf } from './maintainer-config';
import {
  agentOf,
  helpedErrorsOf,
  maintainersSectionPath,
  parsePrLink,
  prCardFacts,
  prTargetOf,
  reportErrorsOf,
  reportPathOf,
} from './pr-feedback';

const PR = { nameWithOwner: 'driftwood-js/driftwood', number: 912 };

describe('a pull request link', () => {
  it.each([
    'https://github.com/driftwood-js/driftwood/pull/912',
    'http://github.com/driftwood-js/driftwood/pull/912',
    'https://www.github.com/driftwood-js/driftwood/pull/912',
    'github.com/driftwood-js/driftwood/pull/912',
    'https://github.com/driftwood-js/driftwood/pull/912/files',
    'https://github.com/driftwood-js/driftwood/pull/912#issuecomment-1',
    'https://github.com/driftwood-js/driftwood/pull/912?w=1',
    '  https://github.com/driftwood-js/driftwood/pull/912  ',
    'driftwood-js/driftwood#912',
  ])('reads %s', (link) => {
    expect(parsePrLink(link)).toEqual(PR);
  });

  it('keeps dots, underscores and case in the repo name', () => {
    expect(parsePrLink('https://github.com/Acme/my_repo.js/pull/7')).toEqual({
      nameWithOwner: 'Acme/my_repo.js',
      number: 7,
    });
  });

  it.each([
    '',
    'driftwood',
    'https://github.com/driftwood-js/driftwood/issues/912',
    'https://github.com/driftwood-js/driftwood/pull/0',
    'https://github.com/driftwood-js/driftwood/pull/abc',
    'https://gitlab.com/driftwood-js/driftwood/pull/912',
    'https://github.com.evil.example/driftwood-js/driftwood/pull/912',
    'https://github.com/driftwood-js/../pull/912',
    'https://github.com/-bad/driftwood/pull/912',
    'driftwood-js/driftwood#',
    'driftwood-js/driftwood #912',
    'https://github.com/driftwood-js/driftwood/pull/1234567890',
  ])('refuses %s', (link) => {
    expect(parsePrLink(link)).toBeNull();
  });
});

describe('the report page address', () => {
  it('names the PR by its footer link or by owner/repo#n, and the flow', () => {
    expect(reportPathOf({ from: '6650a1b2c3d4e5f6a7b8c9d0' })).toBe(
      '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
    );
    expect(reportPathOf({ pr: PR }, 'helped')).toBe(
      '/contribute/maintainers/report?pr=driftwood-js%2Fdriftwood%23912&kind=helped',
    );
    expect(maintainersSectionPath('opt-out')).toBe('/contribute/maintainers#opt-out');
    expect(maintainersSectionPath('work-with-us', '6650a1b2c3d4e5f6a7b8c9d0')).toBe(
      '/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0#work-with-us',
    );
  });

  it('is read back: an attempt id first, a PR otherwise, nothing for anything else', () => {
    expect(prTargetOf({ from: '6650a1b2c3d4e5f6a7b8c9d0', kind: 'helped' })).toEqual({
      target: { from: '6650a1b2c3d4e5f6a7b8c9d0' },
      flow: 'helped',
    });
    expect(prTargetOf({ pr: 'driftwood-js/driftwood#912' })).toEqual({ target: { pr: PR }, flow: 'report' });
    expect(prTargetOf({ from: 'not-an-id', pr: 'x' })).toEqual({ target: null, flow: 'report' });
    expect(prTargetOf({ from: ['6650a1b2c3d4e5f6a7b8c9d0', 'x'], kind: 'other' }).target).toEqual({
      from: '6650a1b2c3d4e5f6a7b8c9d0',
    });
    expect(prTargetOf({}).target).toBeNull();
  });
});

describe('the PR card', () => {
  it('says who opened it and how, in the footer’s words', () => {
    expect(prCardFacts(prCard())).toEqual([
      'opened Oct 27 by mira-dev',
      'reviewed and submitted by mira-dev',
      'agent: Claude (Opus)',
    ]);
    expect(prCardFacts(prCard({ reviewed: false, contributorLogin: null }))).toEqual([
      'opened Oct 27',
      'opened by autopilot',
      'agent: Claude (Opus)',
    ]);
    expect(agentOf('GitRanks Contribute and Claude Code (Opus)')).toBe('Claude Code (Opus)');
    expect(agentOf('Something else')).toBe('Something else');
  });
});

describe('the forms', () => {
  it('want at least one reason in a report', () => {
    expect(reportErrorsOf({ reasons: [], details: '', replyTo: '' })).toEqual({ reasons: 'Pick at least one.' });
    expect(reportErrorsOf({ reasons: ['OTHER'], details: '', replyTo: '' })).toEqual({});
  });

  it('keep the text and the address within the API’s limits', () => {
    expect(reportErrorsOf({ reasons: ['OTHER'], details: 'x'.repeat(2001), replyTo: 'sam' })).toEqual({
      details: 'At most 2,000 characters.',
      replyTo: 'Enter an email address, or leave it empty.',
    });
    expect(helpedErrorsOf({ word: ' '.repeat(3000), replyTo: '  ' })).toEqual({});
    expect(helpedErrorsOf({ word: '', replyTo: `${'a'.repeat(195)}@x.org` })).toEqual({
      replyTo: 'Enter an email address, or leave it empty.',
    });
  });
});

describe('a failed note', () => {
  const failure = (code: string, message = 'x') => new Error(JSON.stringify([{ message, extensions: { code } }]));

  it.each([
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['NOT_FOUND', 'NOT_OURS'],
    ['CONFLICT', 'OWN_PR'],
    ['RATE_LIMITED', 'RATE_LIMITED'],
    ['FORBIDDEN', 'FORBIDDEN'],
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['GITHUB_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['BAD_USER_INPUT', 'INVALID'],
    ['INTERNAL_SERVER_ERROR', 'FAILED'],
  ])('tells %s as %s', (code, error) => {
    expect(prFeedbackErrorOf(failure(code))).toBe(error);
  });

  it('never says a send that broke off did not go through', () => {
    for (const error of ['GITHUB_UNAVAILABLE', 'FAILED'] as const) {
      expect(prFeedbackErrorMessage(error)).toBe(
        "We couldn't finish sending this. Try again; if it went through, we'll merge the two.",
      );
      expect(prFeedbackErrorMessage(error, 'undo')).not.toMatch(/sent/);
      expect(prFeedbackErrorMessage(error, 'read')).toMatch(/Try again/);
    }
  });

  it('tells an API without the operation, and an outage', () => {
    expect(prFeedbackErrorOf(failure('GRAPHQL_VALIDATION_FAILED'))).toBe('NOT_AVAILABLE_YET');
    expect(prFeedbackErrorOf(new Error('GraphQL error! 502: Bad Gateway'))).toBe('FAILED');
  });
});

describe('the keys the page shows', () => {
  it('are the live ones, `contribute` only while no other is live', () => {
    const facts = maintainerFacts();
    expect(liveKeysOf(facts).map(({ key }) => key)).toEqual(['contribute']);
    expect(configExampleOf(liveKeysOf(facts))).toEqual([
      { key: 'contribute', value: 'on', comment: 'off keeps GitRanks Contribute out' },
    ]);
    expect(configAbilitiesOf(liveKeysOf(facts))).toBeNull();
    expect(liveKeysOf(null)).toEqual([]);
  });

  it('give each live key a value within its bounds, and say what they allow', () => {
    const keys = maintainerFacts().configKeys.map((key) => ({ ...key, live: true }));
    const example = configExampleOf(keys);

    expect(example.map(({ key }) => key)).not.toContain('contribute');
    expect(example.find(({ key }) => key === 'max_open_prs')?.value).toBe('1');
    expect(example.find(({ key }) => key === 'min_account_age_years')?.value).toBe('6');
    const tight = configExampleOf([{ ...keys[3], min: 5, max: 8 }]);
    expect(tight[0].value).toBe('5');
    expect(configAbilitiesOf(keys)).toBe(
      'Lower our limits, keep autopilot out, keep good first issues for people, choose who may open PRs, name a contact.',
    );
  });

  it('give the badge’s Markdown exactly', () => {
    expect(contributeBadgeMarkdown('owner/name')).toBe(
      '[![GitRanks Contribute](https://gitranks.com/badge/repo/owner/name/contribute.svg)](https://gitranks.com/contribute/maintainers)',
    );
  });
});
