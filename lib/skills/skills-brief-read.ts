import { skillsBriefApiPath } from './paths';
import type { SkillsBriefAnswer } from './skills.types';

/** The reads on their way, by login in lower case. */
const pending = new Map<string, Promise<SkillsBriefAnswer | null>>();

/**
 * A person's Skills numbers, read in the browser for the profile's tab and its overview's block: while one read is on
 * its way, both share it, so the page asks once (the answer is then kept a minute by the browser). Null on a failure.
 */
export function readSkillsBrief(login: string): Promise<SkillsBriefAnswer | null> {
  const key = login.toLowerCase();
  const known = pending.get(key);
  if (known) return known;
  const read = fetch(skillsBriefApiPath(login))
    .then((response) => (response.ok ? (response.json() as Promise<SkillsBriefAnswer>) : null))
    .catch(() => null)
    .finally(() => pending.delete(key));
  pending.set(key, read);
  return read;
}
