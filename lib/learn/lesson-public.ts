import type { LessonVisibility } from './learn.types';

/**
 * What a stub says, by why the lesson is closed: removed by its author, or (the lesson page alone) held while reports
 * on its questions are read. A hidden lesson reads as one that is not there (`MISSING`, the 404's words): it is not
 * available, and the address names nothing more.
 */
export function stubTextOf(visibility: LessonVisibility | 'MISSING'): { title: string; text: string } {
  switch (visibility) {
    case 'REMOVED':
      return {
        title: 'This lesson was removed by its author',
        text: 'Its author took it down, with the results on it. Any pull request it belonged to is still on GitHub.',
      };
    case 'HELD':
      return {
        title: 'This lesson is paused',
        text: 'We are reading reports on its questions. The results that pull requests link to stay up.',
      };
    case 'MISSING':
      return { title: 'This page is not available', text: 'The address may be wrong, or the page was hidden.' };
    default:
      return {
        title: 'This lesson is not available',
        text: 'The address may be wrong, or the lesson was hidden. Any pull request it belonged to is still on GitHub.',
      };
  }
}
