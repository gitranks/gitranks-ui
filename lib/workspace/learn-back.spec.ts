import { describe, expect, it } from 'vitest';

import { learnBackOf, learnSetupHrefOf } from './paths';

describe('learnBackOf', () => {
  it.each([
    ['/learn', '/learn'],
    ['/learn/lessons/find-duplicates-with-a-set', '/learn/lessons/find-duplicates-with-a-set'],
    ['/learn/courses/algorithms', '/learn/courses/algorithms'],
    ['/learn/courses/algorithms/check', '/learn/courses/algorithms/check'],
    ['/learn/issues?lesson=find-duplicates&for-you=0', '/learn/issues?lesson=find-duplicates&for-you=0'],
    ['/learn/lessons/find-duplicates/real-world', '/learn/lessons/find-duplicates/real-world'],
    ['/learn/progress?view=history', '/learn/progress?view=history'],
    ['/learn/review', '/learn/review'],
    ['/my/issues/k2m9qa?from=learn', '/my/issues/k2m9qa?from=learn'],
    ['/my/issues/k2m9qa?from=learn&repo=octo%2Fapp&look=1', '/my/issues/k2m9qa?from=learn&repo=octo%2Fapp&look=1'],
    ['/my/start/octo/app/12?lesson=1', '/my/start/octo/app/12?lesson=1'],
    ['/my/start/octo/app/12?from=learn', '/my/start/octo/app/12?from=learn'],
    ['/my/settings?from=learn', '/my/settings?from=learn'],
    ['/my/settings/github?from=learn', '/my/settings/github?from=learn'],
    ['/my/pull-requests?from=learn', '/my/pull-requests?from=learn'],
    ['/my/agent?from=learn', '/my/agent?from=learn'],
    ['/my/agent/connect?from=learn', '/my/agent/connect?from=learn'],
  ])('takes %s', (back, path) => {
    expect(learnBackOf(back)).toBe(path);
  });

  it.each([
    ['Learn’s onboarding itself', '/learn/setup'],
    ['Learn’s onboarding with its own way back', '/learn/setup?back=%2Flearn'],
    ['Learn’s onboarding in upper case', '/LEARN/SETUP'],
    ['Settings, not opened from Learn', '/my/settings'],
    ['Settings, opened from Contribute', '/my/settings?from=contribute'],
    ['the Agent tab, not opened from Learn', '/my/agent'],
    ['the Agent tab, opened from Contribute', '/my/agent/key?from=contribute'],
    ['the page of one issue, opened from Contribute', '/my/issues/k2m9qa?from=contribute'],
    ['the page of one issue, opened from nowhere', '/my/issues/k2m9qa'],
    ['a Start page from Contribute', '/my/start/octo/app/12'],
    ['Contribute', '/contribute'],
    ['the site’s home', '/'],
    ['an outside address', 'https://evil.example/learn'],
    ['an outside address with no scheme', 'evil.example/learn'],
    ['a protocol-relative address', '//evil.example/learn'],
    ['a backslash', '/\\evil.example/learn'],
    ['a backslash inside', '/learn\\..\\contribute'],
    ['an encoded backslash', '/%5Cevil.example/learn'],
    ['an encoded //', '/%2F%2Fevil.example/learn'],
    ['an encoded / in the path', '/learn%2F..%2Fcontribute'],
    ['an empty segment', '/learn//lessons/a'],
    ['a dot segment', '/learn/../contribute'],
    ['an encoded dot segment', '/learn/%2e%2e/contribute'],
    ['a control character', '/learn\n/lessons'],
    ['a string that does not decode', '/learn/%E0%A4%A'],
    ['nothing', ''],
    ['not a string', 42],
    ['null', null],
  ])('refuses %s', (_, back) => {
    expect(learnBackOf(back)).toBeNull();
  });
});

describe('learnSetupHrefOf', () => {
  it('carries a way back it takes', () => {
    expect(learnSetupHrefOf('/learn/lessons/find-duplicates')).toBe(
      '/learn/setup?back=%2Flearn%2Flessons%2Ffind-duplicates',
    );
    expect(learnSetupHrefOf('/my/issues/k2m9qa?from=learn&look=1')).toBe(
      '/learn/setup?back=%2Fmy%2Fissues%2Fk2m9qa%3Ffrom%3Dlearn%26look%3D1',
    );
  });

  it('leaves out a way back it refuses, and none', () => {
    expect(learnSetupHrefOf('//evil.example')).toBe('/learn/setup');
    expect(learnSetupHrefOf('/learn/setup')).toBe('/learn/setup');
    expect(learnSetupHrefOf(null)).toBe('/learn/setup');
    expect(learnSetupHrefOf()).toBe('/learn/setup');
  });

  it('round-trips: the address it writes reads back as the same way back', () => {
    const href = learnSetupHrefOf('/learn/issues?repo=octo%2Fapp&lesson=a');
    const back = new URL(href, 'https://gitranks.com').searchParams.get('back');
    expect(learnBackOf(back)).toBe('/learn/issues?repo=octo%2Fapp&lesson=a');
  });
});
