import { describe, expect, it } from 'vitest';

import { emptyProfile, filledProfile } from './__fixtures__/profile';
import {
  cleanProfileInput,
  formOf,
  formProblemOf,
  goalKindsOf,
  inputOf,
  languageChoicesOf,
  levelRowsOf,
  projectOf,
  withFocus,
  withLevel,
} from './profile-form';

describe('the Learn profile form', () => {
  it('starts empty without a profile, and from the saved goal, levels and focus with one', () => {
    expect(formOf(null)).toEqual({
      goalKind: null,
      language: '',
      project: '',
      domain: null,
      levels: [],
      focus: [],
    });
    const form = formOf(filledProfile);
    expect(form.goalKind).toBe('LANGUAGE');
    expect(form.language).toBe('TypeScript');
    expect(form.project).toBe('');
    expect(form.focus).toEqual(['LANGUAGE', 'PATTERNS']);
    expect(form.levels.map(({ language, guessed }) => [language, guessed])).toEqual([
      ['JavaScript', true],
      ['TypeScript', false],
      ['Python', true],
    ]);
  });

  it('keeps levels in range, one per language, and focus in the page order', () => {
    const form = formOf({
      goalKind: 'PROJECT',
      goalValue: ' vercel/next.js ',
      levels: [
        { language: 'Go', level: 7, guessed: true, hint: null },
        { language: 'go', level: 1, guessed: true, hint: null },
        { language: 'Rust', level: -2, guessed: false, hint: null },
        { language: ' ', level: 1, guessed: true, hint: null },
      ],
      focus: ['TESTS', 'LANGUAGE'],
      updatedAt: null,
    });
    expect(form.project).toBe('vercel/next.js');
    expect(form.language).toBe('');
    expect(form.levels.map(({ language, level }) => [language, level])).toEqual([
      ['Go', 3],
      ['Rust', 0],
    ]);
    expect(form.focus).toEqual(['LANGUAGE', 'TESTS']);
  });

  it('offers a domain only when it is the saved goal', () => {
    expect(goalKindsOf(formOf(emptyProfile))).toEqual(['LANGUAGE', 'PROJECT']);
    expect(goalKindsOf(formOf(filledProfile))).toEqual(['LANGUAGE', 'PROJECT']);
    const domain = formOf({ ...filledProfile, goalKind: 'DOMAIN', goalValue: 'databases' });
    expect(goalKindsOf(domain)).toEqual(['LANGUAGE', 'DOMAIN', 'PROJECT']);
    expect(domain.domain).toBe('databases');
    expect(inputOf(domain)?.goalValue).toBe('databases');
  });

  it("lists the user's languages first, then the common ones, once each", () => {
    const choices = languageChoicesOf(formOf(emptyProfile));
    expect(choices.slice(0, 3)).toEqual(['JavaScript', 'TypeScript', 'Python']);
    expect(choices.filter((language) => language.toLowerCase() === 'typescript')).toHaveLength(1);
    expect(choices).toContain('Rust');
    expect(languageChoicesOf({ levels: [], language: 'Zig' })[0]).toBe('Zig');
  });

  it("puts the goal's language first as Your goal, and adds it at New to it when the user has no level in it", () => {
    const rows = levelRowsOf(formOf(filledProfile));
    expect(rows.map(({ language, goal, note }) => [language, goal, note])).toEqual([
      ['TypeScript', true, 'Your goal · 2 repos, since Oct 2026'],
      ['JavaScript', false, '14 repos, since 2023'],
      ['Python', false, 'No public repos'],
    ]);
    const added = levelRowsOf({ ...formOf(emptyProfile), goalKind: 'LANGUAGE', language: 'Rust' });
    expect(added[0]).toMatchObject({ language: 'Rust', level: 0, guessed: false, goal: true, note: 'Your goal' });
    expect(added).toHaveLength(4);
    expect(levelRowsOf(formOf(emptyProfile)).every(({ goal }) => !goal)).toBe(true);
  });

  it('marks a level the user sets as theirs, and adds a language not listed yet', () => {
    const form = withLevel(formOf(emptyProfile), 'typescript', 3);
    const typescript = form.levels.find(({ language }) => language === 'TypeScript');
    expect(typescript).toMatchObject({ level: 3, guessed: false });
    expect(form.levels.find(({ language }) => language === 'JavaScript')?.guessed).toBe(true);
    const added = withLevel(form, 'Rust', 9);
    expect(added.levels.at(-1)).toEqual({ language: 'Rust', level: 3, guessed: false, hint: null });
  });

  it('ticks and unticks focus in the page order', () => {
    let form = withFocus(formOf(null), 'TESTS', true);
    form = withFocus(form, 'LANGUAGE', true);
    expect(form.focus).toEqual(['LANGUAGE', 'TESTS']);
    expect(withFocus(form, 'TESTS', false).focus).toEqual(['LANGUAGE']);
  });

  it('reads a project from its name or its GitHub address', () => {
    expect(projectOf('vercel/next.js')).toBe('vercel/next.js');
    expect(projectOf(' https://github.com/vercel/next.js/tree/canary ')).toBe('vercel/next.js');
    expect(projectOf('github.com/rust-lang/rust.git')).toBe('rust-lang/rust');
    expect(projectOf('next.js')).toBeNull();
    expect(projectOf('a/b/c')).toBeNull();
    expect(projectOf('-bad/repo')).toBeNull();
    expect(projectOf('owner/..')).toBeNull();
  });

  it('says what is missing before it can be saved', () => {
    const empty = formOf(emptyProfile);
    expect(formProblemOf(empty)).toBe('Pick what you want to learn.');
    expect(formProblemOf({ ...empty, goalKind: 'LANGUAGE' })).toBe('Pick a language.');
    expect(formProblemOf({ ...empty, goalKind: 'PROJECT' })).toBe('Name the project, as owner/repo.');
    expect(formProblemOf({ ...empty, goalKind: 'PROJECT', project: 'next.js' })).toMatch(/as owner\/repo/);
    expect(formProblemOf({ ...empty, goalKind: 'PROJECT', project: 'vercel/next.js' })).toBeNull();
    expect(inputOf(empty)).toBeNull();
  });

  it('sends the goal, every level shown and the focus', () => {
    expect(inputOf(formOf(filledProfile))).toEqual({
      goalKind: 'LANGUAGE',
      goalValue: 'TypeScript',
      levels: [
        { language: 'TypeScript', level: 1 },
        { language: 'JavaScript', level: 2 },
        { language: 'Python', level: 0 },
      ],
      focus: ['LANGUAGE', 'PATTERNS'],
    });
    const project = { ...formOf(emptyProfile), goalKind: 'PROJECT' as const, project: 'github.com/vercel/next.js' };
    expect(inputOf(project)).toMatchObject({ goalKind: 'PROJECT', goalValue: 'vercel/next.js' });
    // Switching goals keeps the other goal's value in the form, and sends only the picked one.
    expect(inputOf({ ...project, language: 'Go' })?.goalValue).toBe('vercel/next.js');
  });
});

describe('the profile input the server takes from the browser', () => {
  const good = {
    goalKind: 'PROJECT',
    goalValue: 'https://github.com/vercel/next.js',
    levels: [
      { language: 'TypeScript', level: 2 },
      { language: 'typescript', level: 3 },
    ],
    focus: ['TESTS', 'LANGUAGE'],
  };

  it('cleans a good one: the project as owner/repo, one level per language, focus in order', () => {
    expect(cleanProfileInput(good)).toEqual({
      goalKind: 'PROJECT',
      goalValue: 'vercel/next.js',
      levels: [{ language: 'TypeScript', level: 2 }],
      focus: ['LANGUAGE', 'TESTS'],
    });
  });

  it('refuses anything else', () => {
    expect(cleanProfileInput(null)).toBeNull();
    expect(cleanProfileInput('x')).toBeNull();
    expect(cleanProfileInput({ ...good, goalKind: 'TOPIC' })).toBeNull();
    expect(cleanProfileInput({ ...good, goalValue: '' })).toBeNull();
    expect(cleanProfileInput({ ...good, goalValue: 'not a repo' })).toBeNull();
    expect(cleanProfileInput({ ...good, goalKind: 'LANGUAGE', goalValue: 'x'.repeat(201) })).toBeNull();
    expect(cleanProfileInput({ ...good, levels: [{ language: 'Go', level: 4 }] })).toBeNull();
    expect(cleanProfileInput({ ...good, levels: [{ language: 'Go', level: 1.5 }] })).toBeNull();
    expect(cleanProfileInput({ ...good, levels: [{ language: '', level: 1 }] })).toBeNull();
    expect(cleanProfileInput({ ...good, levels: 'Go' })).toBeNull();
    expect(
      cleanProfileInput({ ...good, levels: Array.from({ length: 51 }, (_, i) => ({ language: `L${i}`, level: 0 })) }),
    ).toBeNull();
    expect(cleanProfileInput({ ...good, focus: ['LANGUAGE', 'EVERYTHING'] })).toBeNull();
  });
});
