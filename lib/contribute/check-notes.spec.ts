import { describe, expect, it } from 'vitest';

import { CHECK_VERDICT_WORDS, checkNoteLineOf, checkNotesOf, checkVerdictOf, checkVerdictsOf } from './check-notes';
import type { ContributeCheckNote, ContributeCheckVerdict } from './contribute.types';

const note = (patch: Partial<ContributeCheckNote> = {}): ContributeCheckNote => ({
  name: 'Fast checks',
  kind: 'NOT_PR',
  why: 'It fails on the base branch too.',
  by: null,
  round: 3,
  ...patch,
});

describe('a failing check that calls nobody, in a line', () => {
  it('says each kind in its words, a run’s verdict with its number and reason', () => {
    expect(checkNoteLineOf(note())).toBe(
      'Fast checks fails: not from this pull request (run 3: It fails on the base branch too)',
    );
    expect(checkNoteLineOf(note({ name: 'deploy-preview', kind: 'CONTRIBUTOR', why: 'Approve the preview.' }))).toBe(
      'deploy-preview: yours to clear (run 3: Approve the preview)',
    );
    expect(
      checkNoteLineOf(note({ name: 'e2e (merge)', kind: 'BASE', why: 'It fails only on the merge.', round: 2 })),
    ).toBe('e2e (merge) needs the base branch (run 2: It fails only on the merge)');
    expect(
      checkNoteLineOf(note({ name: 'docs-links', kind: 'SOMEONE_ELSE', why: null, by: 'sam-w', round: null })),
    ).toBe('docs-links started failing on a commit by sam-w');
    expect(checkNoteLineOf(note({ name: 'build', kind: 'SETTLING', why: null, round: null }))).toBe(
      'build: checks still running',
    );
  });

  it('drops a part the API leaves out: the reason, the run, who pushed', () => {
    expect(checkNoteLineOf(note({ why: null }))).toBe('Fast checks fails: not from this pull request (run 3)');
    expect(checkNoteLineOf(note({ round: null }))).toBe(
      'Fast checks fails: not from this pull request (It fails on the base branch too)',
    );
    expect(checkNoteLineOf(note({ why: '  ', round: null }))).toBe('Fast checks fails: not from this pull request');
    expect(checkNoteLineOf(note({ kind: 'CONTRIBUTOR', why: null, round: null }))).toBe('Fast checks: yours to clear');
    expect(checkNoteLineOf(note({ kind: 'BASE', why: null, round: null }))).toBe('Fast checks needs the base branch');
    expect(checkNoteLineOf(note({ kind: 'SOMEONE_ELSE', by: null }))).toBe(
      'Fast checks started failing on a commit by someone else',
    );
    expect(checkNoteLineOf(note({ kind: 'SOMEONE_ELSE', by: '   ' }))).toBe(
      'Fast checks started failing on a commit by someone else',
    );
    expect(checkNoteLineOf(note({ kind: 'SOMEONE_ELSE', by: `  ${'s'.repeat(60)}  ` }))).toBe(
      `Fast checks started failing on a commit by ${'s'.repeat(39)}…`,
    );
    // A reason on a kind that has none in its line is left out, never guessed into it.
    expect(checkNoteLineOf(note({ kind: 'SETTLING' }))).toBe('Fast checks: checks still running');
  });

  it('names the check alone for a kind this UI does not know yet, and cuts untrusted text to a line', () => {
    expect(checkNoteLineOf(note({ kind: 'SOMETHING_NEW' as never, why: null, round: null }))).toBe('Fast checks');
    expect(checkNoteLineOf(note({ kind: 'SOMETHING_NEW' as never }))).toBe(
      'Fast checks (run 3: It fails on the base branch too)',
    );
    const long = checkNoteLineOf(note({ name: 'n'.repeat(200), why: 'w'.repeat(500) }));
    expect(long.startsWith(`${'n'.repeat(79)}… fails`)).toBe(true);
    expect(long.length).toBeLessThan(340);
    expect(checkNoteLineOf(note({ why: 'line one\n\nline <b>two</b>.' }))).toContain(
      '(run 3: line one line <b>two</b>)',
    );
  });

  it('lists nothing for a list not answered, null or empty, nor a note without a name', () => {
    expect(checkNotesOf(undefined)).toEqual([]);
    expect(checkNotesOf(null)).toEqual([]);
    expect(checkNotesOf([])).toEqual([]);
    expect(checkNotesOf([note(), note({ name: ' ' })])).toEqual([note()]);
  });
});

describe('a run’s verdict on a failing check', () => {
  const verdict = (patch: Partial<ContributeCheckVerdict> = {}): ContributeCheckVerdict => ({
    name: 'lint',
    whose: 'PR',
    why: 'The new file misses a semicolon.',
    ...patch,
  });

  it('says whose the check is in words, with the reason', () => {
    expect(CHECK_VERDICT_WORDS).toEqual({
      PR: "this pull request's",
      NOT_PR: 'not from this pull request',
      CONTRIBUTOR: 'yours to clear',
      BASE: 'needs the base branch',
    });
    expect(checkVerdictOf(verdict())).toEqual({
      name: 'lint',
      whose: "this pull request's",
      why: 'The new file misses a semicolon.',
    });
    expect(checkVerdictOf(verdict({ whose: 'BASE', why: '' }))).toEqual({
      name: 'lint',
      whose: 'needs the base branch',
      why: '',
    });
  });

  it('keeps the name and the reason of a verdict this UI does not know yet, and lists none when not answered', () => {
    expect(checkVerdictOf(verdict({ whose: 'SOMEONE' as never }))).toMatchObject({ name: 'lint', whose: null });
    expect(checkVerdictsOf(undefined)).toEqual([]);
    expect(checkVerdictsOf(null)).toEqual([]);
    expect(checkVerdictsOf([verdict(), verdict({ name: '' })])).toEqual([verdict()]);
  });
});
