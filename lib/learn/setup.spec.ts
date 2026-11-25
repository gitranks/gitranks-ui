import { describe, expect, it } from 'vitest';

import { setupForms, setupGuessed, setupNone, setupNothing, setupWorking } from './__fixtures__/setup';
import {
  levelHintOf,
  missingOf,
  missingWordsOf,
  pendingSetupForm,
  type SetupField,
  type SetupForm,
  setupFormAfter,
  setupFormPick,
  setupFormUnread,
  setupInputOf,
  setupInputOfForm,
  setupIntroOf,
  setupPillOf,
  setupReadOf,
  valuesOfRead,
} from './setup';

const FIELDS: SetupField[] = ['mainLanguage', 'otherLanguages', 'level'];
const pills = (form: SetupForm) => FIELDS.map((field) => setupPillOf(form, field));
const formOf = (index: number) => setupForms[index].form;

describe('Set up Learn: what the API answers', () => {
  it('reads a setup of the shape it has, and nothing else', () => {
    expect(setupReadOf(setupGuessed)).toEqual(setupGuessed);
    expect(setupReadOf({ state: 'NOPE' })).toBeNull();
    expect(setupReadOf(null)).toBeNull();
    expect(setupReadOf('GUESSED')).toBeNull();
    expect(
      setupReadOf({ state: 'GUESSED', mainLanguage: 3, otherLanguages: ['go', 4], level: '2', guessed: 'x' }),
    ).toEqual({ state: 'GUESSED', mainLanguage: null, otherLanguages: ['go'], level: null, guessed: [] });
  });

  it('shows only the seven languages, never the main one among the others, six at most, and a level of the three', () => {
    expect(
      valuesOfRead({ mainLanguage: 'go', otherLanguages: ['go', 'typescript', 'ruby', 'python'], level: 3 }),
    ).toEqual({ mainLanguage: 'go', otherLanguages: ['python', 'ruby'], level: 3 });
    expect(valuesOfRead({ mainLanguage: 'cobol', otherLanguages: [], level: 4 })).toEqual({
      mainLanguage: null,
      otherLanguages: [],
      level: null,
    });
    expect(
      valuesOfRead({
        mainLanguage: null,
        otherLanguages: ['python', 'javascript', 'go', 'rust', 'java', 'php', 'ruby'],
        level: 1,
      }).otherLanguages,
    ).toHaveLength(6);
  });
});

describe('Set up Learn: what a save takes', () => {
  const good = { mainLanguage: 'go', otherLanguages: ['python', 'rust'], level: 2 };

  it('takes a main language and others of the seven, and a level of the three', () => {
    expect(setupInputOf(good)).toEqual(good);
    expect(setupInputOf({ ...good, otherLanguages: [] })).toEqual({ ...good, otherLanguages: [] });
    expect(
      setupInputOf({ ...good, otherLanguages: ['python', 'javascript', 'rust', 'java', 'php', 'ruby'] }),
    ).not.toBeNull();
  });

  it.each([
    ['no input', null],
    ['a string', 'go'],
    ['a main language not of the seven', { ...good, mainLanguage: 'typescript' }],
    ['no main language', { ...good, mainLanguage: undefined }],
    ['a level of none of the three', { ...good, level: 4 }],
    ['a level of 0', { ...good, level: 0 }],
    ['a level as words', { ...good, level: '2' }],
    ['others that are not a list', { ...good, otherLanguages: 'python' }],
    ['another language not of the seven', { ...good, otherLanguages: ['python', 'kotlin'] }],
    ['the same language twice', { ...good, otherLanguages: ['python', 'python'] }],
    ['the main language among the others', { ...good, otherLanguages: ['go'] }],
    ['seven others', { ...good, otherLanguages: ['python', 'javascript', 'rust', 'java', 'php', 'ruby', 'go'] }],
  ])('refuses %s', (_name, input) => {
    expect(setupInputOf(input)).toBeNull();
  });
});

describe("Set up Learn: the page's states, as the design catalogue draws them", () => {
  it('1 · our guess is ready: every field ours, and the line says so', () => {
    const form = formOf(0);
    expect(form.values).toEqual({ mainLanguage: 'go', otherLanguages: ['python'], level: 3 });
    expect(pills(form)).toEqual(['guess', 'guess', 'guess']);
    expect(setupIntroOf(form)).toBe(
      'We guessed these from your public GitHub profile. Change what is wrong, then save. Until you save, Learn uses these guesses.',
    );
  });

  it('2 · still working: nothing chosen, no notes, and what the person chooses stays', () => {
    const form = formOf(1);
    expect(form.source).toBe('waiting');
    expect(form.values).toEqual({ mainLanguage: null, otherLanguages: [], level: null });
    expect(pills(form)).toEqual([null, null, null]);
    expect(setupIntroOf(form)).toMatch(/^We are reading your public GitHub profile\./);
    expect(setupFormAfter(form, setupNone, null)).toEqual(form);
  });

  it('3 · still working, two things chosen: they are the person’s', () => {
    const form = formOf(2);
    expect(form.values).toEqual({ mainLanguage: 'rust', otherLanguages: [], level: 2 });
    expect(pills(form)).toEqual(['picked', null, 'picked']);
  });

  it('4 · our guess arrives: the two choices stay, and only the untouched field is filled', () => {
    const form = formOf(3);
    expect(form.values).toEqual({ mainLanguage: 'rust', otherLanguages: ['python'], level: 2 });
    expect(pills(form)).toEqual(['picked', 'guess', 'picked']);
    expect(form.arrived).toBe(true);
    expect(setupIntroOf(form)).toBe(
      'Our guess is in. We kept what you chose and filled in only what you had not touched. Check it, then save.',
    );
  });

  it('keeps the main language a person chose off the others our guess fills in', () => {
    const chosen = setupFormPick(formOf(1), { field: 'mainLanguage', language: 'python' });
    expect(setupFormAfter(chosen, setupGuessed, null).values).toEqual({
      mainLanguage: 'python',
      otherLanguages: [],
      level: 3,
    });
    expect(pills(setupFormAfter(chosen, setupGuessed, null))).toEqual(['picked', null, 'guess']);
  });

  it('never moves a language the person ticked under the others into the main language our guess fills', () => {
    const waiting = setupFormAfter(pendingSetupForm(), setupWorking, null);
    // While the guess runs, they tick Go; the guess comes back with Go as the main language.
    const tickedGo = setupFormPick(waiting, { field: 'otherLanguages', language: 'go' });
    const arrived = setupFormAfter(tickedGo, setupGuessed, null);
    expect(arrived.values).toEqual({ mainLanguage: null, otherLanguages: ['go'], level: 3 });
    expect(pills(arrived)).toEqual([null, 'picked', 'guess']);
    expect(missingOf(arrived.values)).toEqual(['mainLanguage']);
    // A main language they did not tick is still filled, and their ticks stay as they are.
    const tickedRust = setupFormPick(waiting, { field: 'otherLanguages', language: 'rust' });
    expect(setupFormAfter(tickedRust, setupGuessed, null).values).toEqual({
      mainLanguage: 'go',
      otherLanguages: ['rust'],
      level: 3,
    });
  });

  it('never moves a ticked language into the main language when our guess found nothing', () => {
    const waiting = setupFormAfter(pendingSetupForm(), setupWorking, null);
    const tickedPython = setupFormPick(waiting, { field: 'otherLanguages', language: 'python' });
    const forNow = setupFormAfter(tickedPython, setupNothing, null);
    expect(forNow.values).toEqual({ mainLanguage: null, otherLanguages: ['python'], level: 2 });
    expect(forNow.mainFrom).toBeNull();
    expect(pills(forNow)).toEqual([null, 'picked', 'guess']);
    expect(setupIntroOf({ ...forNow, arrived: false })).toBe(
      'We found nothing about you to start from. Choose what fits you, then save.',
    );
    // The language they switched an example to, ticked as well: it stays among the others.
    const tickedRust = setupFormPick(waiting, { field: 'otherLanguages', language: 'rust' });
    expect(setupFormAfter(tickedRust, setupNothing, 'rust').values).toEqual({
      mainLanguage: null,
      otherLanguages: ['rust'],
      level: 2,
    });
  });

  it('5 · nothing found: Python for now, the level ours', () => {
    const form = formOf(4);
    expect(form.values).toEqual({ mainLanguage: 'python', otherLanguages: [], level: 2 });
    expect(pills(form)).toEqual(['for-now', null, 'guess']);
    expect(setupIntroOf(form)).toBe(
      'We found nothing about you to start from, so examples open in Python for now. Choose what fits you, then save.',
    );
  });

  it('6 · nothing found, an example switched to Rust: Rust is their main language', () => {
    const form = formOf(5);
    expect(form.values.mainLanguage).toBe('rust');
    expect(pills(form)).toEqual(['picked', null, 'guess']);
    expect(setupIntroOf(form)).toBe(
      'We found nothing about you to start from. You switched an example to Rust, so Rust is your main language now. Fill in the rest, then save.',
    );
    // A language that is not one of the seven was never Learn's main language: Python for now.
    expect(setupPillOf(setupFormAfter(pendingSetupForm(), setupNothing, 'typescript'), 'mainLanguage')).toBe('for-now');
  });

  it('our guess did not come: the person fills the fields, told plainly', () => {
    const form = formOf(6);
    expect(form.source).toBe('unread');
    expect(setupIntroOf(form)).toBe(
      'We could not read your public GitHub profile just now. Choose what fits you, then save.',
    );
    // A guess that comes after all still fills only what is untouched.
    const after = setupFormAfter(setupFormPick(form, { field: 'level', level: 1 }), setupGuessed, null);
    expect(after.values).toEqual({ mainLanguage: 'go', otherLanguages: ['python'], level: 1 });
  });

  it('saved before: the person’s own, with no notes', () => {
    const form = formOf(7);
    expect(form.values).toEqual({ mainLanguage: 'rust', otherLanguages: ['python', 'go'], level: 2 });
    expect(pills(form)).toEqual([null, null, null]);
    expect(pills(setupFormPick(form, { field: 'level', level: 3 }))).toEqual([null, null, null]);
    expect(setupIntroOf(form)).toBe('Learn uses these for you. Change what you want, then save.');
  });

  it('loading: nothing chosen, and the line says it is on its way', () => {
    expect(formOf(8).source).toBe('pending');
    expect(setupIntroOf(formOf(8))).toBe('Loading your setup…');
    expect(setupFormAfter(pendingSetupForm(), setupWorking, null).source).toBe('waiting');
    expect(setupFormUnread(pendingSetupForm()).source).toBe('unread');
  });
});

describe('Set up Learn: what the person changes', () => {
  it('takes the main language off the others, and makes the field theirs', () => {
    const form = setupFormPick(formOf(0), { field: 'mainLanguage', language: 'python' });
    expect(form.values).toEqual({ mainLanguage: 'python', otherLanguages: [], level: 3 });
    expect(pills(form)).toEqual(['picked', 'guess', 'guess']);
  });

  it('ticks and unticks another language, in the page’s order, never the main one and six at most', () => {
    let form = setupFormPick(formOf(0), { field: 'otherLanguages', language: 'ruby' });
    form = setupFormPick(form, { field: 'otherLanguages', language: 'javascript' });
    expect(form.values.otherLanguages).toEqual(['python', 'javascript', 'ruby']);
    expect(setupPillOf(form, 'otherLanguages')).toBe('picked');
    expect(setupFormPick(form, { field: 'otherLanguages', language: 'go' })).toBe(form);
    form = setupFormPick(form, { field: 'otherLanguages', language: 'python' });
    expect(form.values.otherLanguages).toEqual(['javascript', 'ruby']);
  });

  it('says which field a save still needs', () => {
    expect(missingOf(formOf(1).values)).toEqual(['mainLanguage', 'level']);
    expect(missingOf(formOf(2).values)).toEqual([]);
    expect(missingWordsOf(['mainLanguage', 'level'])).toBe(
      'Choose your main language and how much you have programmed, then save.',
    );
    expect(missingWordsOf(['mainLanguage'])).toBe('Choose your main language, then save.');
    expect(missingWordsOf(['level'])).toBe('Choose how much you have programmed, then save.');
    expect(setupInputOfForm(formOf(1))).toBeNull();
    expect(setupInputOfForm(formOf(3))).toEqual({ mainLanguage: 'rust', otherLanguages: ['python'], level: 2 });
  });

  it('says where each level starts, with no word of issues', () => {
    expect([null, 1, 2, 3].map((level) => levelHintOf(level as 1 | 2 | 3 | null))).toEqual([
      'Sets where you start in a course.',
      'You start with the first lesson of a course.',
      'You start on a course’s page and choose where to begin.',
      'We offer the 2-minute check, so you skip what you know.',
    ]);
  });
});
