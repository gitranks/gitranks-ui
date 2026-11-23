import 'server-only';

import { loadLearnAddress, loadLearnLessonPage } from './lesson-page.data';
import { type LessonShareState, lessonShareStateOf } from './lesson-share';

/** A lesson's state for its copy and its pictures, from the same cached reads as its page (the lesson's tag). */
export const loadLessonShareState = (slug: string): Promise<LessonShareState> =>
  lessonShareStateOf(slug, {
    lesson: async (asked) => (await loadLearnLessonPage(asked))?.lesson ?? null,
    address: (asked) => loadLearnAddress('lesson', asked),
  });
