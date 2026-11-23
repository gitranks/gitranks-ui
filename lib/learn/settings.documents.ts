import { parse } from 'graphql';

import type { LearnEmailSettings, LearnEmailSettingsInput } from './settings';
import type DocumentNode from '@/types/typed-document-node';

/*
 * Learn's email settings, the signed-in person's own: the read and the save. Null when Learn is not open to them.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const SETTINGS = 'lessonsToRepeat timeZone timeZoneBy';

/** "Lessons to repeat" on or off, the zone the morning emails keep, and whether the person chose it. */
export const LearnEmailSettingsDocument = doc<{ learnEmailSettings: LearnEmailSettings | null }>(
  `query LearnEmailSettings { learnEmailSettings { ${SETTINGS} } }`,
);

/** Saves the fields sent, and only those: an absent field keeps what is saved. */
export const SaveLearnEmailSettingsDocument = doc<
  { saveLearnEmailSettings: LearnEmailSettings | null },
  { settings: LearnEmailSettingsInput }
>(
  `mutation SaveLearnEmailSettings($settings: LearnEmailSettingsInput!) {
    saveLearnEmailSettings(settings: $settings) { ${SETTINGS} }
  }`,
);
