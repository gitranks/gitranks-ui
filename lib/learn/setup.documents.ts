import { parse } from 'graphql';

import type { LearnSetupRead, LearnSetupState, SetupInput } from './setup';
import type DocumentNode from '@/types/typed-document-node';

/*
 * Set up Learn's read and its two writes, each the signed-in person's own: the setup, starting our guess, and a save.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const SETUP = 'state mainLanguage otherLanguages level guessed';

/** The person's setup: its state, the three fields, and which are still our guess. Null when Learn is not open. */
export const LearnSetupOfMineDocument = doc<{ learnSetupOfMine: LearnSetupRead | null }>(
  `query LearnSetupOfMine { learnSetupOfMine { ${SETUP} } }`,
);

/** Starts our guess when there is no setup and no guess yet; safe on every visit. Answers the state. */
export const StartLearnSetupGuessDocument = doc<{ startLearnSetupGuess: LearnSetupState | null }>(
  'mutation StartLearnSetupGuess { startLearnSetupGuess }',
);

/**
 * Saves the three fields: the person's own from now on. `onboarding`, sent only from Learn's onboarding, also gives the
 * person the Learn sign.
 */
export const SaveLearnSetupDocument = doc<
  { saveLearnSetup: LearnSetupRead | null },
  { setup: SetupInput; onboarding?: boolean }
>(
  `mutation SaveLearnSetup($setup: LearnSetupInput!, $onboarding: Boolean) { saveLearnSetup(setup: $setup, onboarding: $onboarding) { ${SETUP} } }`,
);
