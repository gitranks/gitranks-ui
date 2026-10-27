/** The signed-in user's removal state, for their Privacy tab. */
export type DataRemovalStatus = { removed: boolean };

/** What the server answers once a removal went through. */
export type DataRemovalResult = { status: 'removed'; profile: boolean };
