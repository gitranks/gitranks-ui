/*
 * Parts of Interviews on pages that are not its own. A page draws one only once the switch below is on.
 */

/**
 * Interviews is open to everyone: the header's Grow entry, and later the pieces on Learn's cached pages, are then in
 * the page as the server renders it, for every visitor. While false, only a person Interviews is open to sees them,
 * once their browser read `/api/me/interviews/open`; everyone else gets today's page, unchanged.
 */
export const INTERVIEWS_OPEN_TO_EVERYONE = false;
