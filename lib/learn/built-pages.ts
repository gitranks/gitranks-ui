/*
 * Whether each Learn page that has an address in `paths.ts` but may not exist yet is built. A link, a Markdown line or
 * a sitemap entry to one of them is drawn only while its constant is true; each is true once its page exists.
 */

/** The Issues page: `/learn/issues`, and its addresses narrowed to a project or a lesson. True once the page exists. */
export const LEARN_ISSUES_PAGE_BUILT: boolean = true;

/** A project course's page: `/learn/repos/<owner>/<name>` and `/learn/orgs/<login>`. True once the page exists. */
export const LEARN_PROJECT_COURSE_PAGE_BUILT: boolean = false;

/** A fix's "Learn from it" view: `/learn/fixes/<owner>/<repo>/<number>`. True once the page exists. */
export const LEARN_FIXES_PAGE_BUILT: boolean = true;

/**
 * Approve and send: `/my/pull-requests/<owner>/<repo>/<issue>/approve`. Until it exists, "Finish the walkthrough" leads
 * the fixer to their pull request's page, where today's form approves. True once the page exists (step 19).
 */
export const LEARN_APPROVE_PAGE_BUILT: boolean = false;

/**
 * The fixer's switch that stops sharing their answers, on the answers page. Pull requests already sent link the old
 * address of the fixer's result, which would show "not found" once the answers are hidden; the switch reaches people
 * only once that address leads to the new answers page. Step 19, which adds that redirect, turns it on.
 */
export const LEARN_ANSWERS_SHARE_SWITCH_ON: boolean = false;
