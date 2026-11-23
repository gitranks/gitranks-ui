'use server';

import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
import { type LearnSetupRead, type LearnSetupState, setupInputOf, setupReadOf } from './setup';
import { SaveLearnSetupDocument, StartLearnSetupGuessDocument } from './setup.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/*
 * Set up Learn's writes, each as the session's user and never one named in the arguments. Null data when Learn is not
 * open to the person.
 */

/** Starts our guess when there is no setup and no guess yet; safe on every visit. Answers the setup's state. */
export async function startLearnSetupGuessAction(): Promise<LearnActionResult<LearnSetupState | null>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(StartLearnSetupGuessDocument, {}, { source: 'client', githubLogin });
    return { ok: true, data: data.startLearnSetupGuess ?? null };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}

/**
 * Saves the three fields: a main language of Learn's seven, at most six other languages of the seven (not the main
 * one, each once), and a level of the three. Anything else is refused before the API is asked.
 */
export async function saveLearnSetupAction(input: {
  mainLanguage: string;
  otherLanguages: string[];
  level: number;
}): Promise<LearnActionResult<LearnSetupRead | null>> {
  const setup = setupInputOf(input);
  if (!setup) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(SaveLearnSetupDocument, { setup }, { source: 'client', githubLogin });
    return { ok: true, data: setupReadOf(data.saveLearnSetup) };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}
