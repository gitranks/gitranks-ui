import { describe, expect, it } from 'vitest';

import { KEY_NOTICE_KINDS, keyNoticeWordsOf } from './notice-words';

describe('keyNoticeWordsOf', () => {
  it('says a refused key and the way on', () => {
    expect(keyNoticeWordsOf({ kind: 'key-invalid' })).toEqual({
      title: 'Your Claude key stopped working',
      text: 'Anthropic refused it: it was deleted, or it is not the key you meant. Contributing is paused until you connect a working one.',
    });
  });

  it('says when used-up credits renew, by their date or the renewal day', () => {
    expect(keyNoticeWordsOf({ kind: 'exhausted', until: '2026-12-01T00:00:00.000Z' }).text).toBe(
      'Nothing starts until they renew on Dec 1. Nothing is spent beyond them.',
    );
    expect(keyNoticeWordsOf({ kind: 'exhausted', until: null }).text).toBe(
      'Nothing starts until they renew on your renewal day. Nothing is spent beyond them.',
    );
  });

  it("says when the workspace's limit resets, by its date or the 1st", () => {
    const words = keyNoticeWordsOf({ kind: 'limit-reached', until: '2026-12-01T00:00:00.000Z' });
    expect(words.title).toBe("Your workspace's spend limit is reached");
    expect(words.text).toBe(
      'The Claude Console stopped this workspace at its monthly limit. Work starts again on Dec 1, or raise the limit in the Console.',
    );
    expect(keyNoticeWordsOf({ kind: 'limit-reached', until: null }).text).toContain(
      'Work starts again when the limit resets on the 1st,',
    );
  });

  it('has words for every kind it names, and no long dash', () => {
    for (const kind of KEY_NOTICE_KINDS) {
      const words = keyNoticeWordsOf(kind === 'key-invalid' ? { kind } : { kind, until: null });
      expect(words.title.length).toBeGreaterThan(0);
      expect(`${words.title} ${words.text}`).not.toMatch(/\u2014/);
    }
  });
});
