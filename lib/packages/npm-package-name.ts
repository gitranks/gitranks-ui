/** The longest name the npm registry takes, its scope included. */
export const NPM_NAME_MAX_LENGTH = 214;

/** Names the registry never takes, in any letter case. */
const RESERVED = new Set(['node_modules', 'favicon.ico']);

/** A part of a name is used in URLs as it is: only the characters `encodeURIComponent` leaves alone. */
const isUrlSafe = (part: string) => part.length > 0 && encodeURIComponent(part) === part;

/**
 * Whether `name` can name a package on the npm registry, by npm's own rules for package names (the `name` field of
 * `package.json`, as `validate-npm-package-name` checks it): 1 to 214 characters, scope included; URL-safe characters
 * only; a scoped name is `@scope/name`, both parts URL-safe, its name part never starting with `.` (it may start with
 * `_`); an unscoped name never starts with `.` or `_` and is not `node_modules` or `favicon.ico`; no spaces. Capital letters and `~'!()*` are refused for new
 * names only, and older names that hold them are still on the registry, so they are taken here.
 */
export function isNpmPackageName(name: string): boolean {
  if (name.length === 0 || name.length > NPM_NAME_MAX_LENGTH) return false;

  if (name.startsWith('@')) {
    const parts = name.slice(1).split('/');
    return parts.length === 2 && parts.every(isUrlSafe) && !parts[1].startsWith('.');
  }

  if (name.startsWith('.') || name.startsWith('_')) return false;
  if (RESERVED.has(name.toLowerCase())) return false;
  return isUrlSafe(name);
}
