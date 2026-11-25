import {
  type LearnSetupRead,
  pendingSetupForm,
  type SetupForm,
  setupFormAfter,
  setupFormPick,
  setupFormUnread,
} from '../setup';

/** Our guess has not started: the person's very first Learn page. */
export const setupNone: LearnSetupRead = {
  state: 'NONE',
  mainLanguage: null,
  otherLanguages: [],
  level: null,
  guessed: [],
};

/** Our guess runs. */
export const setupWorking: LearnSetupRead = { ...setupNone, state: 'WORKING' };

/** Our guess from the public profile, as page 5's board draws it: Go, Python too, an experienced developer. */
export const setupGuessed: LearnSetupRead = {
  state: 'GUESSED',
  mainLanguage: 'go',
  otherLanguages: ['python'],
  level: 3,
  guessed: ['mainLanguage', 'otherLanguages', 'level'],
};

/** Our guess found no language: the level alone, at "Some experience". */
export const setupNothing: LearnSetupRead = {
  state: 'GUESSED',
  mainLanguage: null,
  otherLanguages: [],
  level: 2,
  guessed: ['level'],
};

/** A setup the person saved before. */
export const setupSaved: LearnSetupRead = {
  state: 'SAVED',
  mainLanguage: 'rust',
  otherLanguages: ['python', 'go'],
  level: 2,
  guessed: [],
};

/** While our guess runs, the person chose two things themselves: Rust, and some experience. */
const pickedTwo = setupFormPick(
  setupFormPick(setupFormAfter(pendingSetupForm(), setupWorking, null), { field: 'mainLanguage', language: 'rust' }),
  { field: 'level', level: 2 },
);

/** The page's six states on page 5's board, in its order, then the ones it adds. */
export const setupForms: { title: string; form: SetupForm }[] = [
  { title: '1 · Our guess is ready', form: setupFormAfter(pendingSetupForm(), setupGuessed, null) },
  {
    title: '2 · Opened while we are still working (also the very first Learn page)',
    form: setupFormAfter(pendingSetupForm(), setupWorking, null),
  },
  { title: '3 · Still working, and they chose two things themselves', form: pickedTwo },
  {
    title: '4 · Then our guess arrives: their two choices stay, only the untouched field is filled',
    form: setupFormAfter(pickedTwo, setupGuessed, null),
  },
  {
    title: '5 · We found nothing: Python until they choose',
    form: setupFormAfter(pendingSetupForm(), setupNothing, null),
  },
  {
    title: '6 · We found nothing, and they switched an example to Rust',
    form: setupFormAfter(pendingSetupForm(), setupNothing, 'rust'),
  },
  {
    title: '7 · Our guess did not come: they fill the fields',
    form: setupFormUnread(setupFormAfter(pendingSetupForm(), setupWorking, null)),
  },
  {
    title: '8 · Saved before, opened again: changed in place',
    form: setupFormAfter(pendingSetupForm(), setupSaved, null),
  },
  { title: '9 · Loading', form: pendingSetupForm() },
];
