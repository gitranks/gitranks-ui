import { parse } from 'graphql';

import type { BuildBar } from './types';
import type DocumentNode from '@/types/typed-document-node';

/*
 * Build's switch and bar, and the fields every Build read selects, written once here so every document asks for the
 * same shape (`types.ts`). A union of the wire (a build's state, the gold test) is one object with a `kind` and the
 * fields of every kind, null where a kind has none.
 */

export const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A step as a link names it. */
export const STEP_REF = 'slug title number';
/** A project as a card shows it. */
export const PROJECT_CARD = 'slug name thing line level subject tags languages minutes baseSteps parts needs';
/** A question: the shared question shape. */
export const QUESTION = 'id type prompt example visual content codes { language code }';
/** Where a build stands. */
export const BUILD_STATE = `kind step { ${STEP_REF} } of builtAt score gold { kind date at }`;
/** One build of the person's. */
export const BUILD_MINE = `build project { slug name thing } language state { ${BUILD_STATE} } lastStepAt stepsDone
  partStep { part step { ${STEP_REF} } of } partsBuilt partsOf answeredEveryStep`;
/** A test that waits for the person. */
export const WAITING_TEST = 'build kind project { slug name } language';

/** Whether Build is open to the signed-in person. */
export const BuildOpenDocument = doc<{ buildOpen: boolean | null }>('query BuildOpen { buildOpen }');

/** Whether Build is open to everyone: asked with no viewer. */
export const BuildOpenToEveryoneDocument = doc<{ buildOpenToEveryone: boolean | null }>(
  'query BuildOpenToEveryone { buildOpenToEveryone }',
);

/** Build's bar for the signed-in person; null when Build is not open to them. */
export const BuildBarDocument = doc<{ buildBar: BuildBar | null }>('query BuildBar { buildBar { hasBuild tests } }');
