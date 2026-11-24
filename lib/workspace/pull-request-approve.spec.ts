import { describe, expect, it } from 'vitest';

import { prApprovals } from './__fixtures__/pull-request';
import {
  approveCardOf,
  isSendKey,
  neededLineOf,
  neededOf,
  PUBLIC_PAGE_NOTE,
  sendKeyNameOf,
  titleHasPrefix,
  withPrefix,
} from './pull-request-approve';

const key = (patch: Partial<KeyboardEvent>) =>
  ({ key: 'Enter', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...patch }) as KeyboardEvent;

describe('the title prefix', () => {
  it('reads the prefix in any case, after spaces, and passes with none', () => {
    expect(titleHasPrefix('fix: cap the list', 'fix:')).toBe(true);
    expect(titleHasPrefix('  FIX: cap the list', 'fix:')).toBe(true);
    expect(titleHasPrefix('Cap the list', 'fix:')).toBe(false);
    expect(titleHasPrefix('Cap the list', null)).toBe(true);
  });

  it('adds it once, in front', () => {
    expect(withPrefix('Cap the list', 'fix:')).toBe('fix: Cap the list');
    expect(withPrefix('fix: Cap the list', 'fix:')).toBe('fix: Cap the list');
  });
});

describe('what is needed before sending', () => {
  it('names the title and the sign-off', () => {
    const needs = neededOf(prApprovals.needs, { title: 'Cap the list', signOff: false });
    expect(needs).toEqual(['a title that starts with “fix:”', 'the sign-off']);
    expect(neededLineOf(needs)).toBe('a title that starts with “fix:”, and the sign-off.');
    expect(neededOf(prApprovals.needs, { title: 'fix: Cap', signOff: true })).toEqual([]);
    expect(neededOf(prApprovals.send, { title: '  ', signOff: false })).toEqual(['a title']);
  });
});

describe('the card', () => {
  const draft = { title: 'Cap the list', signOff: false };

  it('says what the public page is, and sends', () => {
    expect(approveCardOf(prApprovals.send, draft, 'ready')).toEqual({
      note: { tone: 'plain', lead: null, text: PUBLIC_PAGE_NOTE },
      button: 'Send the pull request',
      ready: true,
    });
    expect(approveCardOf(prApprovals.send, draft, 'sending')).toMatchObject({ button: 'Sending…', ready: false });
  });

  it('waits while something is needed, and names it', () => {
    expect(approveCardOf(prApprovals.needs, draft, 'ready')).toMatchObject({
      note: { tone: 'warning', lead: 'Needed before sending:' },
      ready: false,
    });
  });

  it("goes to GitHub for its permission, tries again after a failure, and waits for Learn's walkthrough", () => {
    expect(approveCardOf(prApprovals.github, draft, 'ready')).toMatchObject({
      button: 'Allow on GitHub and send',
      ready: true,
    });
    expect(approveCardOf(prApprovals.send, draft, 'failed')).toMatchObject({
      note: { tone: 'error' },
      button: 'Send it again',
      ready: true,
    });
    expect(approveCardOf({ ...prApprovals.send, walkthroughPassed: false }, draft, 'ready').ready).toBe(false);
  });
});

describe('the key that sends', () => {
  it('is Ctrl + Enter or ⌘ + Enter, never Enter alone', () => {
    expect(isSendKey(key({ ctrlKey: true }))).toBe(true);
    expect(isSendKey(key({ metaKey: true }))).toBe(true);
    expect(isSendKey(key({}))).toBe(false);
    expect(isSendKey(key({ ctrlKey: true, shiftKey: true }))).toBe(false);
    expect(isSendKey(key({ key: 'a', ctrlKey: true }))).toBe(false);
  });

  it('is named as the platform names it', () => {
    expect(sendKeyNameOf('MacIntel')).toBe('⌘');
    expect(sendKeyNameOf('Win32')).toBe('Ctrl');
  });
});
