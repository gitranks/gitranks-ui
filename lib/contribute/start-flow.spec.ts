import { describe, expect, it } from 'vitest';

import { firstIssueLineOf, languagesLineOf, languagesLineText, repickedOf, startingLanguagesOf } from './start-flow';

const OWN = { own: true, hosted: false };
const KEY = { own: false, hosted: true };
const BOTH = { own: true, hosted: true };

describe('the first issue’s head, by what is connected', () => {
  it('names the own agent, else "Your agent"', () => {
    expect(firstIssueLineOf(OWN, 'Claude Code')).toBe(
      'Claude Code is connected. These open issues fit what you work on. See one in full, then start it.',
    );
    expect(firstIssueLineOf(OWN, null)).toBe(
      'Your agent is connected. These open issues fit what you work on. See one in full, then start it.',
    );
  });

  it('says the hosted agent begins at once for a key, and asks who works on it for both', () => {
    expect(firstIssueLineOf(KEY, null)).toBe(
      'Your Claude key is connected. These open issues fit what you work on. See one in full, then start it, and the hosted agent begins at once.',
    );
    expect(firstIssueLineOf(BOTH, 'Codex')).toBe(
      'Your agents are connected. These open issues fit what you work on. See one in full, then start it and choose who works on it.',
    );
  });

  it('while the first issues are picked, and when nothing fits', () => {
    expect(firstIssueLineOf(OWN, 'Claude Code', 'picking')).toBe(
      'Claude Code is connected. Your first issues are on their way.',
    );
    expect(firstIssueLineOf(OWN, 'Claude Code', 'none')).toBe(
      'Claude Code is connected, so you are ready when an issue comes.',
    );
    expect(firstIssueLineOf(KEY, null, 'none')).toBe(
      'Your Claude key is connected, so you are ready when an issue comes.',
    );
    expect(firstIssueLineOf(BOTH, null, 'picking')).toBe(
      'Your agents are connected. Your first issues are on their way.',
    );
  });
});

describe('the line of languages', () => {
  it('shows the saved languages, without naming the profile', () => {
    expect(languagesLineText(languagesLineOf(['JS_TS', 'PYTHON', 'GO'], ['RUST']))).toBe(
      'Picked for JavaScript / TypeScript, Python and Go.',
    );
  });

  it('shows the profile’s while nothing is saved, and says where they come from', () => {
    expect(languagesLineText(languagesLineOf(null, ['JS_TS', 'PYTHON', 'GO']))).toBe(
      'Picked for JavaScript / TypeScript, Python and Go, from your GitHub profile.',
    );
    expect(languagesLineText(languagesLineOf(null, ['GO']))).toBe('Picked for Go, from your GitHub profile.');
    expect(languagesLineText(languagesLineOf(null, ['GO', 'RUST']))).toBe(
      'Picked for Go and Rust, from your GitHub profile.',
    );
  });

  it('says every language when none is known, or none is saved', () => {
    expect(languagesLineText(languagesLineOf(null, []))).toBe('Picked from every language.');
    expect(languagesLineText(languagesLineOf([], ['GO']))).toBe('Picked from every language.');
  });

  it('"Change" opens with what the line shows', () => {
    expect(startingLanguagesOf(['RUST'], ['GO'])).toEqual(['RUST']);
    expect(startingLanguagesOf(null, ['GO', 'PYTHON'])).toEqual(['GO', 'PYTHON']);
    expect(startingLanguagesOf([], ['GO'])).toEqual([]);
  });
});

describe('repickedOf: the list picked again after a save', () => {
  it('compares two server times, and nothing else', () => {
    expect(repickedOf('2026-11-25T09:00:00.000Z', '2026-11-25T09:00:01.000Z')).toBe(true);
    expect(repickedOf('2026-11-25T09:00:00.000Z', '2026-11-25T09:00:00.000Z')).toBe(false);
    expect(repickedOf('2026-11-25T09:00:00.000Z', '2026-11-25T08:59:00.000Z')).toBe(false);
    expect(repickedOf('2026-11-25T09:00:00.000Z', null)).toBe(false);
    expect(repickedOf(null, '2026-11-25T09:00:00.000Z')).toBe(true);
    expect(repickedOf(null, null)).toBe(false);
    expect(repickedOf('2026-11-25T09:00:00.000Z', 'not a time')).toBe(false);
  });
});
