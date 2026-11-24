/**
 * A masked issue's fields, as every read that lists open issues asks them: `masked { ${MASKED_ISSUE_FIELDS} }`. A
 * read that adds them is an operation of its own, so an API that does not know them yet fails it alone, and the caller
 * asks today's operation instead.
 */
export const MASKED_ISSUE_FIELDS = 'id title language size kind projectTier project hints { kind count }';

/** The masked part of a list's row, for the operations that add it to today's fields. */
export const MASKED_PART = `masked { ${MASKED_ISSUE_FIELDS} }`;
