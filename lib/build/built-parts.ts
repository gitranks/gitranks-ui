/*
 * Parts of Build that later work brings. A page says a sentence about one only once it is there: the pull request
 * that builds the part turns its switch on.
 */

/** The email on the morning the gold test first opens. */
export const BUILD_EMAILS_BUILT = false;

/** The "Built" section of a person's Skills page, which lists their built projects. */
export const BUILD_SKILLS_BUILT = false;

/** The public repository of every project's code: a project's page links it once it is published. */
export const BUILD_CODE_REPOSITORY_PUBLIC = false;

/**
 * Build is open to everyone: the header's Grow menu and the home page's three cards are then in the page as the
 * server renders it, for every visitor. While false, only a person Build is open to sees them, once their browser
 * read `/api/me/build/open`; everyone else gets today's header and block, unchanged.
 */
export const BUILD_OPEN_TO_EVERYONE = false;
