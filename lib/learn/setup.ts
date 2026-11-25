import { languageNameOf } from './learn-question';

/*
 * Set up Learn: three fields, main language, other languages and level. We guess them from the person's
 * public profile the first time they open a Learn page; they confirm or change the guess. A value the person chose is
 * never overwritten by a guess that arrives later.
 */

/** Learn's seven languages, in the order the page lists them. */
export const SETUP_LANGUAGES = ['python', 'javascript', 'go', 'rust', 'java', 'php', 'ruby'] as const;
export type SetupLanguage = (typeof SETUP_LANGUAGES)[number];

export const isSetupLanguage = (value: unknown): value is SetupLanguage =>
  typeof value === 'string' && (SETUP_LANGUAGES as readonly string[]).includes(value);

/** A saved setup holds at most this many other languages. */
export const OTHER_LANGUAGES_MAX = 6;

/** The three levels, stored as 1, 2 and 3. */
export type SetupLevel = 1 | 2 | 3;
export const SETUP_LEVELS: { level: SetupLevel; label: string }[] = [
  { level: 1, label: 'New to programming' },
  { level: 2, label: 'Some experience' },
  { level: 3, label: 'Experienced developer' },
];

const isSetupLevel = (value: unknown): value is SetupLevel => value === 1 || value === 2 || value === 3;

/** None yet, our guess running, our guess waiting for the person, the person's own. */
export type LearnSetupState = 'NONE' | 'WORKING' | 'GUESSED' | 'SAVED';
const SETUP_STATES: readonly LearnSetupState[] = ['NONE', 'WORKING', 'GUESSED', 'SAVED'];

/** The three fields, by the names the API gives them in `guessed`. */
export type SetupField = 'mainLanguage' | 'otherLanguages' | 'level';

/** The setup as the API answers it: its state, the three fields, and which of them are still our guess. */
export type LearnSetupRead = {
  state: LearnSetupState;
  mainLanguage: string | null;
  otherLanguages: string[];
  level: number | null;
  guessed: string[];
};

/** The three fields as the page holds them: only Learn's seven languages, and a level of the three. */
export type SetupValues = {
  mainLanguage: SetupLanguage | null;
  otherLanguages: SetupLanguage[];
  level: SetupLevel | null;
};

const arrayOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The API's answer when it has the setup's shape; null for anything else. */
export function setupReadOf(value: unknown): LearnSetupRead | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (!SETUP_STATES.includes(raw.state as LearnSetupState)) return null;
  return {
    state: raw.state as LearnSetupState,
    mainLanguage: typeof raw.mainLanguage === 'string' ? raw.mainLanguage : null,
    otherLanguages: arrayOf(raw.otherLanguages).filter((item): item is string => typeof item === 'string'),
    level: typeof raw.level === 'number' ? raw.level : null,
    guessed: arrayOf(raw.guessed).filter((item): item is string => typeof item === 'string'),
  };
}

/** A read's fields as the page shows them: a language not of the seven dropped, the main one never among the others. */
export function valuesOfRead(read: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'>): SetupValues {
  const mainLanguage = isSetupLanguage(read.mainLanguage) ? read.mainLanguage : null;
  const otherLanguages = SETUP_LANGUAGES.filter(
    (language) => language !== mainLanguage && read.otherLanguages.includes(language),
  ).slice(0, OTHER_LANGUAGES_MAX);
  return { mainLanguage, otherLanguages, level: isSetupLevel(read.level) ? read.level : null };
}

/** What a save sends. */
export type SetupInput = { mainLanguage: SetupLanguage; otherLanguages: SetupLanguage[]; level: SetupLevel };

/**
 * A save's input when it is one the API takes: a main language of the seven, at most six other languages, each of the
 * seven, once, and not the main one, and a level of the three. Null for anything else: nothing is sent.
 */
export function setupInputOf(value: unknown): SetupInput | null {
  if (!value || typeof value !== 'object') return null;
  const { mainLanguage, otherLanguages, level } = value as Record<string, unknown>;
  if (!isSetupLanguage(mainLanguage) || !isSetupLevel(level) || !Array.isArray(otherLanguages)) return null;
  if (otherLanguages.length > OTHER_LANGUAGES_MAX) return null;
  if (!otherLanguages.every(isSetupLanguage)) return null;
  if (new Set(otherLanguages).size !== otherLanguages.length || otherLanguages.includes(mainLanguage)) return null;
  return { mainLanguage, otherLanguages: [...otherLanguages], level };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The page's form                                                                                                    */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * Where the fields came from, which the line under the title says:
 * - `pending`: the person's setup is on its way;
 * - `waiting`: our guess is running (also the very first Learn page: the guess starts right here);
 * - `guess`: our guess, from the public profile;
 * - `nothing`: our guess found nothing to start from;
 * - `unread`: our guess did not come (the profile could not be read); the person fills the fields;
 * - `saved`: the person's own setup, saved before.
 */
export type SetupSource = 'pending' | 'waiting' | 'guess' | 'nothing' | 'unread' | 'saved';

export type SetupForm = {
  values: SetupValues;
  /** The fields the person changed on this page: never filled by a guess that arrives later. */
  touched: SetupField[];
  /** The fields our guess filled and the person has not changed. */
  guessed: SetupField[];
  source: SetupSource;
  /** With no language found: the main language is the one picked on an example (`example`), or Python for now. */
  mainFrom: 'example' | 'for-now' | null;
  /** Our guess arrived while the page was open, after the person had chosen something themselves. */
  arrived: boolean;
};

const NO_VALUES: SetupValues = { mainLanguage: null, otherLanguages: [], level: null };

/** The form before anything is read. */
export const pendingSetupForm = (): SetupForm => ({
  values: NO_VALUES,
  touched: [],
  guessed: [],
  source: 'pending',
  mainFrom: null,
  arrived: false,
});

/** The language our guess falls back on when it found none and no example was switched: as the examples do. */
const FOR_NOW_LANGUAGE: SetupLanguage = 'python';

/**
 * The form once a read (or a later one, while our guess runs) answers. Only the fields the person has not touched
 * are filled; a field they chose stays as they chose it. With no language found, the main language is the one they
 * switched an example to (`examplePick`), else Python for now.
 */
export function setupFormAfter(form: SetupForm, read: LearnSetupRead, examplePick: string | null): SetupForm {
  if (read.state === 'NONE' || read.state === 'WORKING') {
    return { ...form, source: form.source === 'pending' ? 'waiting' : form.source };
  }
  const open = (field: SetupField) => !form.touched.includes(field);
  const shown = valuesOfRead(read);
  const values = { ...form.values };
  const filled: SetupField[] = [];
  let mainFrom = form.mainFrom;
  // A language the person ticked under the others stays there: it never becomes the main language they did not choose.
  const ticked = (language: SetupLanguage) =>
    form.touched.includes('otherLanguages') && form.values.otherLanguages.includes(language);
  if (open('mainLanguage')) {
    if (shown.mainLanguage) {
      if (!ticked(shown.mainLanguage)) {
        values.mainLanguage = shown.mainLanguage;
        filled.push('mainLanguage');
      }
      mainFrom = null;
    } else if (read.state === 'GUESSED') {
      const picked = isSetupLanguage(examplePick) ? examplePick : null;
      const main = picked ?? FOR_NOW_LANGUAGE;
      if (!ticked(main)) {
        values.mainLanguage = main;
        mainFrom = picked ? 'example' : 'for-now';
      }
    }
  }
  if (open('otherLanguages')) {
    values.otherLanguages = shown.otherLanguages;
    filled.push('otherLanguages');
  }
  if (open('level') && shown.level) {
    values.level = shown.level;
    filled.push('level');
  }
  // The main language, chosen by the person or found, is never one of the others. It only ever drops a language our
  // guess added: a language the person ticked never becomes the main language above.
  values.otherLanguages = values.otherLanguages.filter((language) => language !== values.mainLanguage);
  const guess = read.state === 'GUESSED';
  return {
    values,
    touched: form.touched,
    guessed: guess
      ? filled.filter(
          (field) => read.guessed.includes(field) && (field !== 'otherLanguages' || values.otherLanguages.length),
        )
      : [],
    source: !guess ? 'saved' : shown.mainLanguage ? 'guess' : 'nothing',
    mainFrom: guess ? mainFrom : null,
    arrived: guess && form.source === 'waiting' && form.touched.length > 0,
  };
}

/** The form once our guess is known not to come: the person fills what is empty. */
export const setupFormUnread = (form: SetupForm): SetupForm => ({ ...form, source: 'unread' });

/** The change the person made: a main language, an other language ticked or not, or a level. */
export type SetupPick =
  | { field: 'mainLanguage'; language: SetupLanguage }
  | { field: 'otherLanguages'; language: SetupLanguage }
  | { field: 'level'; level: SetupLevel };

/** The form after the person's change; the field is theirs from now on. */
export function setupFormPick(form: SetupForm, pick: SetupPick): SetupForm {
  const values = { ...form.values };
  if (pick.field === 'mainLanguage') {
    values.mainLanguage = pick.language;
    values.otherLanguages = values.otherLanguages.filter((language) => language !== pick.language);
  } else if (pick.field === 'otherLanguages') {
    if (pick.language === values.mainLanguage) return form;
    const ticked = values.otherLanguages.includes(pick.language);
    if (!ticked && values.otherLanguages.length >= OTHER_LANGUAGES_MAX) return form;
    values.otherLanguages = SETUP_LANGUAGES.filter((language) =>
      language === pick.language ? !ticked : values.otherLanguages.includes(language),
    );
  } else {
    values.level = pick.level;
  }
  return {
    ...form,
    values,
    touched: form.touched.includes(pick.field) ? form.touched : [...form.touched, pick.field],
    guessed: form.guessed.filter((field) => field !== pick.field),
    mainFrom: pick.field === 'mainLanguage' ? null : form.mainFrom,
  };
}

/** The note beside a field's title: the person chose it, it is our guess, or Python until they choose. */
export type SetupPill = 'picked' | 'guess' | 'for-now';

export const SETUP_PILL_WORDS: Record<SetupPill, string> = {
  picked: 'You picked it',
  guess: 'Our guess',
  'for-now': 'For now',
};

export function setupPillOf(form: SetupForm, field: SetupField): SetupPill | null {
  if (form.source === 'saved') return null;
  if (form.touched.includes(field)) return 'picked';
  if (field === 'mainLanguage' && form.mainFrom === 'example') return 'picked';
  if (field === 'mainLanguage' && form.mainFrom === 'for-now') return 'for-now';
  return form.guessed.includes(field) ? 'guess' : null;
}

/** The line under the page's title, for where the fields came from. */
export function setupIntroOf(form: SetupForm): string {
  if (form.arrived) {
    return 'Our guess is in. We kept what you chose and filled in only what you had not touched. Check it, then save.';
  }
  switch (form.source) {
    case 'pending':
      return 'Loading your setup…';
    case 'waiting':
      return 'We are reading your public GitHub profile. It takes a few seconds. What you choose here stays: we only fill in what you have not touched.';
    case 'guess':
      return 'We guessed these from your public GitHub profile. Change what is wrong, then save. Until you save, Learn uses these guesses.';
    case 'nothing': {
      if (form.mainFrom === 'example' && form.values.mainLanguage) {
        const name = languageNameOf(form.values.mainLanguage);
        return `We found nothing about you to start from. You switched an example to ${name}, so ${name} is your main language now. Fill in the rest, then save.`;
      }
      // A language the person ticked was kept off the main language: nothing is filled in for now.
      if (form.mainFrom !== 'for-now') {
        return 'We found nothing about you to start from. Choose what fits you, then save.';
      }
      return 'We found nothing about you to start from, so examples open in Python for now. Choose what fits you, then save.';
    }
    case 'unread':
      return 'We could not read your public GitHub profile just now. Choose what fits you, then save.';
    case 'saved':
      return 'Learn uses these for you. Change what you want, then save.';
  }
}

/** The line under each field's title. The level's says where the person starts. */
export const MAIN_LANGUAGE_HINT = 'Every example opens in it first.';
export const OTHER_LANGUAGES_HINT = 'We also suggest courses in these.';

export function levelHintOf(level: SetupLevel | null): string {
  if (level === 1) return 'You start with the first lesson of a course.';
  if (level === 2) return 'You start on a course’s page and choose where to begin.';
  if (level === 3) return 'We offer the 2-minute check, so you skip what you know.';
  return 'Sets where you start in a course.';
}

/** The fields a save needs and the form has not got yet, in the page's order. */
export const missingOf = (values: SetupValues): SetupField[] => [
  ...(values.mainLanguage ? [] : ['mainLanguage' as const]),
  ...(values.level ? [] : ['level' as const]),
];

export function missingWordsOf(missing: readonly SetupField[]): string {
  if (missing.includes('mainLanguage') && missing.includes('level')) {
    return 'Choose your main language and how much you have programmed, then save.';
  }
  return missing.includes('mainLanguage')
    ? 'Choose your main language, then save.'
    : 'Choose how much you have programmed, then save.';
}

/** The save's input from the form; null while a field it needs is empty. */
export const setupInputOfForm = ({ values }: SetupForm): SetupInput | null =>
  values.mainLanguage && values.level
    ? { mainLanguage: values.mainLanguage, otherLanguages: values.otherLanguages, level: values.level }
    : null;
