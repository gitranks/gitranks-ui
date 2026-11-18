import { isPackageName, type RegistryId } from '@/lib/packages/registries';

/**
 * The package a "Go to a package" field names on a registry, or null when what was typed cannot name one by the
 * registry's rules (the check the package pages' addresses get). Spaces around the name are dropped; nothing else is
 * changed, since older npm names may hold capitals.
 */
export function packageNameOfInput(input: string, registry: RegistryId): string | null {
  const name = input.trim();
  return isPackageName(registry, name) ? name : null;
}
