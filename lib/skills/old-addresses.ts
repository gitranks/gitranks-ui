/**
 * The old address of a person's public Learn record, `/learn/progress/<login>`: it is their Skills page now, whatever
 * page number it was asked with (the query goes along and the Skills page ignores it). A static redirect, answered
 * before anything renders; for good (308), since the old page is gone. Only an address with a login: `/learn/progress`
 * alone is the learner's own progress.
 *
 * Kept free of imports: the Next config reads it before the app is built.
 */
export type SkillsOldAddressRedirect = { source: string; destination: string; permanent: true };

export const OLD_SKILLS_REDIRECTS: SkillsOldAddressRedirect[] = [
  { source: '/learn/progress/:login{/}?', destination: '/profile/:login/skills', permanent: true },
];
