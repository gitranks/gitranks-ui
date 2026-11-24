import type { Route } from 'next';

/** Every address of a person's Skills page, built here and nowhere else. */

/** A person's profile, which a Skills page belongs to. */
export const skillsProfilePath = (login: string) => `/profile/${encodeURIComponent(login)}` as Route;

/** A person's Skills page. */
export const skillsPath = (login: string) => `${skillsProfilePath(login)}/skills` as Route;

/** The picture a posted link to a Skills page shows. */
export const skillsCardPath = (login: string) => `${skillsPath(login)}/card.png`;

/** A Skills page's Markdown copy, at the page's own address with `.md`. */
export const skillsMarkdownPath = (login: string) => `${skillsPath(login)}.md`;

/**
 * A Skills page's cache tag, on its page, its picture and its Markdown copy: `skills:<login>`, in lower case (GitHub's
 * logins are not case-sensitive, and an address keeps the case the visitor typed).
 */
export const skillsTag = (login: string) => `skills:${login.toLowerCase()}`;

/**
 * The cache tag of the sitemap's list of Skills pages. Hiding or showing a page expires it from this site alone, so
 * the site's expire route does not take it (it is not a `skills:<login>` tag).
 */
export const SKILLS_LOGINS_TAG = 'skills-logins';

/** A login of GitHub's characters, in lower case: up to 39, older logins with hyphens anywhere. */
const SKILLS_TAG = /^skills:[a-z0-9-]{1,39}$/;

/** Whether a tag is a Skills page's, as the API sends it to expire. */
export const isSkillsTag = (tag: string): boolean => SKILLS_TAG.test(tag);

/** A person's numbers alone, read in the browser for the tab and the profile's block. */
export const skillsBriefApiPath = (login: string) => `/api/skills/${encodeURIComponent(login)}`;

/** The next fixes of a person's page, after the cursor the last ones gave. */
export const skillsFixesApiPath = (login: string, after: string) =>
  `${skillsBriefApiPath(login)}/fixes?after=${encodeURIComponent(after)}`;

/** The owner's own view of their page, read in the browser once the page is up. */
export const SKILLS_MINE_PATH = '/api/me/skills';

/** What the owner's tab needs: its "New" mark. */
export const SKILLS_TAB_MINE_PATH = `${SKILLS_MINE_PATH}/tab`;

/** What the owner's own profile overview shows them of Skills: their box's case, their block, their Learn list's top. */
export const skillsProfileMinePath = (login: string) =>
  `${SKILLS_MINE_PATH}/profile?login=${encodeURIComponent(login.trim())}`;

/** The owner opened their tab: its "New" mark goes. */
export const SKILLS_SEEN_MINE_PATH = `${SKILLS_MINE_PATH}/seen`;
