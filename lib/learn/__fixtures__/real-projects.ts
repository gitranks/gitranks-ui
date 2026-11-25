import type { LearnFixRow } from '../issues';
import { learnFixes } from './issues';

/** A lesson's merged fixes as the "Fixed" group reads them, for the catalogue and the specs. */

const projects = ['harbor-kit/relay', 'lumen-data/importer', 'driftwood-js/driftwood', 'quill-ui/forms'];

/** Learn's language of each fix's project, as the API answers it; a project not listed has none known. */
const PROJECT_LANGUAGES: Record<string, string> = {
  'harbor-kit/relay': 'go',
  'lumen-data/importer': 'python',
  'driftwood-js/driftwood': 'javascript',
};

/** Ten fixes of a lesson's 23: the first page. */
export const tenOfMany: LearnFixRow[] = Array.from({ length: 10 }, (_, index) => ({
  ...learnFixes.rows[0],
  repo: projects[index % projects.length],
  issueNumber: 400 + index,
  number: 500 + index,
  title: learnFixes.rows[index % learnFixes.rows.length].title,
  issueUrl: `https://github.com/${projects[index % projects.length]}/issues/${400 + index}`,
  url: `https://github.com/${projects[index % projects.length]}/pull/${500 + index}`,
  mergedAt: `2026-11-${String(20 - index).padStart(2, '0')}T09:00:00.000Z`,
  language: PROJECT_LANGUAGES[projects[index % projects.length]] ?? null,
}));

/** The pull requests whose walkthrough the reader passed. */
export const passedFixes: ReadonlySet<string> = new Set([`${learnFixes.rows[0].repo}#${learnFixes.rows[0].number}`]);
