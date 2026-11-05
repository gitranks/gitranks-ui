import { describe, expect, it } from 'vitest';

import { issueRules } from './__fixtures__/repo-rules';
import type { ContributeConfigKey } from './contribute.types';
import {
  type ConfigControl,
  capRowsOf,
  configControlOf,
  configDraftErrorOf,
  configNoteOf,
  fileReadAtOf,
  pageControlsOf,
  rulesSummaryOf,
  UNSET,
} from './repo-rules';

const key = (patch: Partial<ContributeConfigKey> & { key: string }): ContributeConfigKey => ({
  kind: 'onOff',
  values: 'on | off',
  meaning: 'What it does',
  live: true,
  page: true,
  min: null,
  max: null,
  ...patch,
});

describe('rulesSummaryOf', () => {
  it('says autopilot off once for the rules that turn it off, then how many more', () => {
    expect(rulesSummaryOf(issueRules())).toEqual(['autopilot off', '5 more']);
    const autopilotOnly = issueRules({ lines: issueRules().lines.slice(0, 1) });
    expect(rulesSummaryOf(autopilotOnly)).toEqual(['autopilot off']);
  });

  it('counts the rules where a person need not submit, and says nothing for none', () => {
    const rules = issueRules({ manualOnly: false });
    expect(rulesSummaryOf(rules)).toEqual(['6 rules']);
    expect(rulesSummaryOf({ manualOnly: false, lines: rules.lines.slice(1, 2) })).toEqual(['1 rule']);
    expect(rulesSummaryOf({ manualOnly: false, lines: [] })).toEqual([]);
  });
});

describe('capRowsOf', () => {
  it('puts the user’s own limit beside the repo’s, and only there', () => {
    const rows = capRowsOf(
      { lines: 300, files: 15, linesSource: '.github/gitranks.yml', filesSource: null },
      { maxChangedLines: 400, maxFiles: 15 },
    );
    expect(rows).toEqual([
      { id: 'lines', label: 'Changed lines', value: 300, source: '.github/gitranks.yml', yours: 400 },
      { id: 'files', label: 'Files', value: 15, source: null, yours: null },
    ]);
  });

  it('leaves out the user’s limit when it is not known or the same', () => {
    const caps = { lines: 300, files: 10, linesSource: 'CONTRIBUTING.md', filesSource: 'CONTRIBUTING.md' };
    expect(capRowsOf(caps, null).map(({ yours }) => yours)).toEqual([null, null]);
    expect(capRowsOf(caps, { maxChangedLines: 300, maxFiles: 12 }).map(({ yours }) => yours)).toEqual([null, 12]);
  });
});

describe('a key’s control on "Your repos"', () => {
  it('draws a choice for the on/off kinds, with the docs’ say first and the page’s words', () => {
    const control = configControlOf(key({ key: 'beginner_issues', kind: 'yesNo' }));
    expect(control).toMatchObject({ type: 'pills', label: 'Good first issues' });
    expect(control?.type === 'pills' && control.options).toEqual([
      { value: UNSET, label: 'As your docs say' },
      { value: 'yes', label: 'Open to us' },
      { value: 'no', label: 'People only' },
    ]);
    const other = configControlOf(key({ key: 'something_new', kind: 'allowedOff' }));
    expect(other?.label).toBe('something_new');
    expect(other?.type === 'pills' && other.options.map(({ label }) => label)).toEqual([
      'As your docs say',
      'Allowed',
      'Off',
    ]);
  });

  it('draws a tier select, a bounded number and a contact, and nothing for a kind it does not know', () => {
    const tier = configControlOf(key({ key: 'min_rank', kind: 'tier' }));
    expect(tier?.type === 'select' && tier.options.map(({ value }) => value)).toEqual([
      UNSET,
      'rookie',
      'skilled',
      'pro',
      'expert',
      'master',
      'elite',
      'legend',
    ]);
    expect(configControlOf(key({ key: 'max_files', kind: 'int', min: 1, max: 100 }))).toMatchObject({
      type: 'number',
      min: 1,
      max: 100,
      placeholder: 'Contributor’s own',
    });
    expect(configControlOf(key({ key: 'contact', kind: 'contact' }))).toMatchObject({ type: 'text' });
    expect(configControlOf(key({ key: 'x', kind: 'mystery' }))).toBeNull();
  });

  it('offers only live keys the page sets, in the API’s order', () => {
    const keys = [
      key({ key: 'contribute', page: false }),
      key({ key: 'autopilot', kind: 'allowedOff' }),
      key({ key: 'max_files', kind: 'int', live: false }),
      key({ key: 'contact', kind: 'contact' }),
    ];
    expect(pageControlsOf(keys).map(({ key }) => key)).toEqual(['autopilot', 'contact']);
  });
});

describe('configDraftErrorOf', () => {
  const number = configControlOf(key({ key: 'max_files', kind: 'int', min: 1, max: 100 })) as ConfigControl;
  const contact = configControlOf(key({ key: 'contact', kind: 'contact' })) as ConfigControl;

  it('takes a whole number in range, and empty to clear it', () => {
    expect(configDraftErrorOf(number, '10')).toBeNull();
    expect(configDraftErrorOf(number, ' ')).toBeNull();
    for (const bad of ['0', '101', '2.5', '-3', 'ten']) {
      expect(configDraftErrorOf(number, bad)).toBe('A whole number from 1 to 100.');
    }
  });

  it('takes an email or an https link, 200 characters at most', () => {
    expect(configDraftErrorOf(contact, 'maintainers@example.org')).toBeNull();
    expect(configDraftErrorOf(contact, 'https://github.com/o/r/discussions')).toBeNull();
    expect(configDraftErrorOf(contact, 'http://example.org')).toBe('An email or a link starting with https://.');
    expect(configDraftErrorOf(contact, `https://e.org/${'a'.repeat(200)}`)).toBe('At most 200 characters.');
  });
});

describe('configNoteOf', () => {
  const base = { key: 'max_files', value: null, source: null, setBy: null, ignoredRaw: null, fileReadAt: null };

  it('locks a file value with when the file was read, and names who set a page value', () => {
    expect(configNoteOf({ ...base, value: '10', source: 'FILE', fileReadAt: '2026-11-03T08:40:00.000Z' })).toBe(
      'Set in .github/gitranks.yml (read Nov 3, 2026). Change it there.',
    );
    expect(configNoteOf({ ...base, value: '10', source: 'FILE' })).toBe(
      'Set in .github/gitranks.yml. Change it there.',
    );
    expect(configNoteOf({ ...base, value: '10', source: 'PAGE', setBy: 'mira-k' })).toBe(
      'Set by @mira-k on this page.',
    );
  });

  it('names a file value we skipped, and says nothing of a key nobody set', () => {
    expect(configNoteOf({ ...base, ignoredRaw: '900' })).toBe(
      '.github/gitranks.yml has “max_files: 900”, which it doesn’t take, so we skipped it.',
    );
    expect(configNoteOf(base)).toBeNull();
    expect(configNoteOf(undefined)).toBeNull();
  });

  it('reads when the file was read from any key', () => {
    expect(fileReadAtOf([base, { ...base, fileReadAt: '2026-11-03T08:40:00.000Z' }])).toBe('2026-11-03T08:40:00.000Z');
    expect(fileReadAtOf([base])).toBeNull();
  });
});
