import { describe, expect, it } from 'vitest';

import { APPLY_RULES, applyPromptOf, applyRulesOf, registryLabelOf, registryNamesOf } from './apply-prompt';

const REGISTRIES = [
  { id: 'NPM', label: 'npm' },
  { id: 'PYPI', label: 'PyPI' },
  { id: 'GO', label: 'Go' },
];

describe('the rules', () => {
  it('are six, in the approved order, with no download numbers', () => {
    expect(APPLY_RULES.map(({ title }) => title)).toEqual([
      'Heavily used',
      'Few stars for its reach',
      'Maintained',
      'Safe to use',
      'Open source',
      'Linked both ways',
    ]);
    // Stars and the push keep their numbers; nothing else has one.
    const numbers = APPLY_RULES.flatMap(({ text }) => text.match(/\d[\d,]*/g) ?? []);
    expect(numbers).toEqual(['1,000', '12']);
  });
});

describe('Heavily used, by the registries listed', () => {
  const first = (registries: { id: string; label: string }[]) => applyRulesOf(registries)[0].text;

  it('names only listed registries with no download counts', () => {
    expect(first(REGISTRIES)).toBe(
      'Among the most downloaded packages in its registry. For Go, which publishes no download counts: many well-known GitHub projects depend on it.',
    );
    expect(first([...REGISTRIES, { id: 'MAVEN', label: 'Maven Central' }])).toContain(
      'For Go and Maven Central, which publish no download counts',
    );
  });

  it('says nothing of them when none is listed', () => {
    expect(first(REGISTRIES.slice(0, 2))).toBe('Among the most downloaded packages in its registry.');
    expect(applyRulesOf([])).toEqual(APPLY_RULES);
  });
});

describe('registry names', () => {
  it('lists them in words', () => {
    expect(registryNamesOf(REGISTRIES)).toBe('npm, PyPI and Go');
    expect(registryNamesOf(REGISTRIES.slice(0, 1))).toBe('npm');
    expect(registryNamesOf([])).toBe('');
  });

  it('writes a registry as the list does, and the API’s name for one it does not hold', () => {
    expect(registryLabelOf(REGISTRIES, 'PYPI')).toBe('PyPI');
    expect(registryLabelOf(REGISTRIES, 'NUGET')).toBe('NUGET');
    expect(registryLabelOf(REGISTRIES, null)).toBeNull();
  });
});

describe('the prompt', () => {
  it('names the package, its repository, every rule and the registries, and asks to change nothing', () => {
    const prompt = applyPromptOf({ registry: 'NPM', name: 'tiny-clamp', repository: 'octocat/tiny-clamp' }, REGISTRIES);
    expect(prompt).toContain(
      'Check whether the npm package tiny-clamp (github.com/octocat/tiny-clamp) fits the GitRanks Unsung hero slot',
    );
    applyRulesOf(REGISTRIES).forEach(({ title, text }, index) => {
      expect(prompt).toContain(`${index + 1}. ${title}: ${text}`);
    });
    expect(prompt).toContain('The package must be on one of these registries: npm, PyPI and Go.');
    expect(prompt).toContain('Do not change anything without asking me first.');
  });

  it('names no registry the list does not hold', () => {
    const prompt = applyPromptOf({ registry: 'NPM', name: 'tiny-clamp' }, REGISTRIES.slice(0, 2));
    expect(prompt).not.toMatch(/Maven|Go\b/);
  });

  it('spells the package as its registry does', () => {
    expect(applyPromptOf({ registry: 'PYPI', name: 'tidy_env', displayName: 'Tidy-Env' }, REGISTRIES)).toContain(
      'Check whether the PyPI package Tidy-Env fits',
    );
  });

  it('a nomination we could not find: the name as typed, no registry, no repository', () => {
    const prompt = applyPromptOf({ registry: null, name: 'left-padder' }, REGISTRIES);
    expect(prompt).toContain('Check whether the package left-padder fits');
    expect(prompt).not.toContain('github.com/left');
  });
});
