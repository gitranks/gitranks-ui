/** A masked issue's fields, as every read that lists open issues asks them: `masked { ${MASKED_ISSUE_FIELDS} }`. */
export const MASKED_ISSUE_FIELDS = 'id title language size kind projectTier project hints { kind count }';

/** The masked part of a list's row, for the operations that add it to a row's fields. */
export const MASKED_PART = `masked { ${MASKED_ISSUE_FIELDS} }`;
