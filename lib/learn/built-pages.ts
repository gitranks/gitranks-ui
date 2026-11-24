/*
 * Whether each Learn page that has an address in `paths.ts` but may not exist yet is built. A link, a Markdown line or
 * a sitemap entry to one of them is drawn only while its constant is true; each is true once its page exists.
 */

/** The Issues page: `/learn/issues`, and its addresses narrowed to a project or a lesson. True once the page exists. */
export const LEARN_ISSUES_PAGE_BUILT: boolean = true;

/** A project course's page: `/learn/repos/<owner>/<name>` and `/learn/orgs/<login>`. True once the page exists. */
export const LEARN_PROJECT_COURSE_PAGE_BUILT: boolean = false;

/** A fix's "Learn from it" view: `/learn/fixes/<owner>/<repo>/<number>`. True once the page exists. */
export const LEARN_FIXES_PAGE_BUILT: boolean = false;
