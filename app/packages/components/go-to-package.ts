import { isNpmPackageName } from '@/lib/packages/npm-package-name';

/**
 * The npm package a "Go to a package" field names, or null when what was typed cannot name one by npm's rules (the
 * check the package pages' addresses get). Spaces around the name are dropped; nothing else is changed, since older
 * names may hold capitals.
 */
export function packageNameOfInput(input: string): string | null {
  const name = input.trim();
  return isNpmPackageName(name) ? name : null;
}
