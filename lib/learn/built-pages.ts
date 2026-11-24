/*
 * Whether each Learn page that has an address in `paths.ts` but may not exist yet is built. A link, a Markdown line or
 * a sitemap entry to one of them is drawn only while its constant is true; each is true once its page exists.
 */

/** The Issues page: `/learn/issues`, and its addresses narrowed to a project or a lesson. True once the page exists. */
export const LEARN_ISSUES_PAGE_BUILT: boolean = true;

/** A project course's page: `/learn/repos/<owner>/<name>` and `/learn/orgs/<login>`. True once the page exists. */
export const LEARN_PROJECT_COURSE_PAGE_BUILT: boolean = true;

/** A fix's "Learn from it" view: `/learn/fixes/<owner>/<repo>/<number>`. True once the page exists. */
export const LEARN_FIXES_PAGE_BUILT: boolean = true;

/**
 * Approve and send: `/my/pull-requests/<owner>/<repo>/<issue>/approve`. "Finish the walkthrough" leads the fixer there
 * while it is true, and to their pull request's page while it is false. True once the page exists.
 */
export const LEARN_APPROVE_PAGE_BUILT: boolean = true;

/**
 * The fixer's switch that stops sharing their answers, on the answers page. Pull requests already sent link the old
 * address of the fixer's result, which leads to the new answers page; with the answers hidden, that page says so. True
 * once that address leads there.
 */
export const LEARN_ANSWERS_SHARE_SWITCH_ON: boolean = true;
