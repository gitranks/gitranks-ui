import type { Route } from 'next';

/*
 * A lesson opened in another setting than its course: the same lesson at the same address, with a few things that
 * follow the setting instead of the course. The lesson's page reads it and knows nothing of what the setting is; the
 * part of the site that opened the lesson fills it.
 */

/** The words of the line under a right answer: a lead in bold, then the rest. */
export type LessonSettingLine = { lead: string; tail: string };

export type LessonSetting = {
  /** The strip's way back, in place of the course's: each a link but the last, which is the lesson's place. */
  crumbs: readonly { label: string; href?: Route }[];
  /** Sent with a right answer: where the lesson was opened from. */
  plan: string;
  /** The lesson's own address in the setting: where Learn's setup leads back to. */
  here: Route;
  /** The main button after a right answer: its words, and where it leads. */
  next: { label: string; href: Route };
  /**
   * The line under a right answer in the setting's words; null keeps the lesson's own line. `held`: the person's side
   * says the lesson is not repeated in the review.
   */
  lineOf: (held: boolean) => LessonSettingLine | null;
  /** The quiet button on the right of that line. */
  back: { label: string; href: Route };
  /** Whether the lesson was held when the setting was read: the line before any new answer. */
  held: boolean;
};
