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

/** A login of GitHub's characters, in lower case: up to 39, older logins with hyphens anywhere. */
const SKILLS_TAG = /^skills:[a-z0-9-]{1,39}$/;

/** Whether a tag is a Skills page's, as the API sends it to expire. */
export const isSkillsTag = (tag: string): boolean => SKILLS_TAG.test(tag);
