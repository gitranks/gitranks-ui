import { canonicalNameOf, isPackageName, type RegistryId } from '@/lib/packages/registries';

/**
 * The package a "Go to a package" field names on a registry, or null when what was typed cannot name one by the
 * registry's rules (the check the package pages' addresses get). Spaces around the name are dropped, and a name the
 * registry takes in several spellings is written as the site's addresses spell it (crates.io's `Serde-JSON` is
 * `serde_json`); nothing else is changed, since older npm names may hold capitals.
 */
export function packageNameOfInput(input: string, registry: RegistryId): string | null {
  const name = input.trim();
  return isPackageName(registry, name) ? canonicalNameOf(registry, name) : null;
}
