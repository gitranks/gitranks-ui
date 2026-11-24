import { parse } from 'graphql';

import type { SkillsBrief, SkillsFixes, SkillsLogins, SkillsMine, SkillsPage, SkillsState } from './skills.types';
import type DocumentNode from '@/types/typed-document-node';

/** A person's Skills page, its parts and its owner's view, as the GitRanks GraphQL API answers them. */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const FIGURE = 'key value second name also';
/** The numbers box's fields, as every read of a person's numbers asks them. */
export const NUMBERS = `kind
  figures { ${FIGURE} }
  blockFigures { ${FIGURE} }
  since languages fixes courses made`;
const FIX = `repo issueNumber issueUrl number url language title made state mergedAt
  lesson { slug title course courseName }
  page`;
const FIXES = `rows { ${FIX} } total next`;
const COURSE = `course { slug name kind covers languages lessons numbers { learners goodShare } }
  learned practised mastered finishedAt
  groups { slug name learned lessons { slug title level depth fix } }
  notStarted`;
const PAGE = `login
  numbers { ${NUMBERS} }
  fixes { ${FIXES} }
  courses { ${COURSE} }
  indexable`;
const MINE = `state
  page { ${PAGE} }
  usesContribute usesLearn learnOpen tabNew
  numbers { read kept at repos aiReadsPerDay }`;

type Login = { login: string };

/** A person's public page; null when it is not public (nothing to show, hidden, or no such person). */
export const SkillsPageDocument = doc<{ skillsPage: SkillsPage | null }, Login>(
  `query SkillsPage($login: String!) { skillsPage(login: $login) { ${PAGE} } }`,
);

/** The numbers alone, for the tab and the profile's block; null when the page is not public. */
export const SkillsBriefDocument = doc<{ skillsBrief: SkillsBrief | null }, Login>(
  `query SkillsBrief($login: String!) { skillsBrief(login: $login) { login numbers { ${NUMBERS} } } }`,
);

/** The next fixes of a public page, after a cursor. */
export const SkillsFixesDocument = doc<{ skillsFixes: SkillsFixes | null }, Login & { after: string }>(
  `query SkillsFixes($login: String!, $after: String!) { skillsFixes(login: $login, after: $after) { ${FIXES} } }`,
);

/** The logins whose page search engines may index, a page at a time. */
export const SkillsLoginsDocument = doc<{ skillsLogins: SkillsLogins }, { after: string | null }>(
  'query SkillsLogins($after: String) { skillsLogins(after: $after) { logins next } }',
);

/** The viewer's own page and where it stands; null signed out. */
export const SkillsMineDocument = doc<{ skillsMine: SkillsMine | null }>(`query SkillsMine { skillsMine { ${MINE} } }`);

/** What the viewer's tab needs: its state and its "New" mark. */
export const SkillsTabDocument = doc<{ skillsMine: { state: SkillsState; tabNew: boolean } | null }>(
  'query SkillsTab { skillsMine { state tabNew } }',
);

/** "Hide this page" and "Show it to everyone": the owner's view after it; null with nothing to show. */
export const SetSkillsHiddenDocument = doc<{ setSkillsHidden: SkillsMine | null }, { hidden: boolean }>(
  `mutation SetSkillsHidden($hidden: Boolean!) { setSkillsHidden(hidden: $hidden) { ${MINE} } }`,
);

/** The owner opened their tab: its "New" mark goes. False when there was nothing to mark. */
export const MarkSkillsSeenDocument = doc<{ markSkillsSeen: boolean }>('mutation MarkSkillsSeen { markSkillsSeen }');
