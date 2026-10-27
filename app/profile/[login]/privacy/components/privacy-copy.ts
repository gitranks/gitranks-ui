/** The Privacy tab's and the removal dialog's words, in one place for the copy and its tests. */
export const PRIVACY_COPY = {
  title: 'Your data on GitRanks',
  intro:
    'GitRanks builds your profile, ranks and badges from what your GitHub account shows publicly. You can have all of it removed.',
  removes: [
    'your profile, ranks and their history',
    'the repositories you own, and your place in rankings, contributor tables and our posts on GitRanks',
    'your sign-in, your token and your refresh records',
  ],
  button: 'Remove my data',
  dialogTitle: 'Remove all your GitRanks data?',
  warning:
    'This permanently deletes your GitRanks profile, ranks, history and repositories. Your badges stop working. It can’t be undone, and GitRanks won’t list your account again, even if you sign in.',
  confirmLabel: (login: string) => `Type ${login} to confirm`,
  confirmButton: 'Remove everything',
  removing: 'Removing…',
  cancel: 'Cancel',
  failed: 'The removal didn’t finish. Please try again in a minute.',
  removedTitle: 'Your GitRanks data was removed',
  removedText: 'GitRanks won’t list your account again. To be listed again, write to us.',
  /** A removed account signed in again: that new sign-in can go too. */
  signInAgain: 'Signing in again kept your sign-in. Removing it deletes it and signs you out.',
  removeSignIn: 'Remove my sign-in',
  signedOut: 'Sign in with GitHub to manage the data GitRanks holds about your account.',
  notOwner: (login: string) => `Only @${login} can manage this data. Sign in as them to do it.`,
  emailNote: 'Can’t sign in? Write to us from the email address your GitHub profile shows publicly.',
} as const;
