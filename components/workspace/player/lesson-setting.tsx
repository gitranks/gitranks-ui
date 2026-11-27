'use client';

import { createContext } from 'react';

import type { LessonSetting } from '@/lib/workspace/lesson-setting';

/**
 * The setting a lesson's page was opened in, as the part that opened it provides it. `setting`: the setting once it is
 * known, null while it is read and when there is none. `settled`: the setting, once its read is over (null when there
 * is none): a right answer given while it is read waits for it, so it is sent with the setting or without it, never
 * with a wrong one. No provider (null): the lesson is in its course, as it always was.
 */
export type LessonSettingState = {
  setting: LessonSetting | null;
  settled: () => Promise<LessonSetting | null>;
};

export const LessonSettingContext = createContext<LessonSettingState | null>(null);
