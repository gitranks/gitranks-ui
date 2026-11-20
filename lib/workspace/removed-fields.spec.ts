import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type DocumentNode, Kind, parse, type SelectionSetNode, visit } from 'graphql';
import { describe, expect, it } from 'vitest';

import type { ContributePace, ContributeSettingsInput } from './contribute.types';
import { PACES } from './format';

/**
 * What the pages no longer ask the API for, now that a pause is lifted only by fixing the key and starting issues is
 * the hosted agent's level: no operation pauses or resumes contributing or reads the pause, no `contributor` selects
 * `paused` or `pausedByYou`, its settings select no `autopilot`, and a pace is even or fast. The API removes these
 * once this holds on the main branch, so this spec is that gate: it reads every document the pages send.
 */

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
/** Not the pages' own: builds, tooling, and the API's schema as generated (`types/`). */
const SKIP_TOP = new Set(['.next', '.git', '.claude', '.design', 'types']);

function filesUnder(dir: string, ends: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || (dir === ROOT && SKIP_TOP.has(entry.name))) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(path, ends);
    return ends.some((end) => entry.name.endsWith(end)) ? [path] : [];
  });
}

const isDocument = (value: unknown): value is DocumentNode =>
  typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === Kind.DOCUMENT;

/** Every document the pages send: the exports of each `*.documents.ts`, and each `.gql` file. */
async function documents(): Promise<{ where: string; document: DocumentNode }[]> {
  const found: { where: string; document: DocumentNode }[] = [];
  for (const path of filesUnder(ROOT, ['.documents.ts'])) {
    const module: Record<string, unknown> = await import(path);
    for (const [name, value] of Object.entries(module)) {
      if (isDocument(value)) found.push({ where: `${relative(ROOT, path)} ${name}`, document: value });
    }
  }
  for (const path of filesUnder(ROOT, ['.gql', '.graphql'])) {
    found.push({ where: relative(ROOT, path), document: parse(readFileSync(path, 'utf8')) });
  }
  return found;
}

const REMOVED_OPERATIONS = ['pauseContributing', 'resumeContributing', 'ContributePaused'];

/** The field names a selection set asks for directly, inline fragments included. */
function fieldsOf(selections: SelectionSetNode | undefined): string[] {
  return (selections?.selections ?? []).flatMap((selection) =>
    selection.kind === Kind.FIELD
      ? [selection.name.value]
      : selection.kind === Kind.INLINE_FRAGMENT
        ? fieldsOf(selection.selectionSet)
        : [],
  );
}

/** What a document still asks for of the removed fields, as `<where>: <what>` lines. */
function removedIn(where: string, document: DocumentNode): string[] {
  const found: string[] = [];
  const named = (name: string) => REMOVED_OPERATIONS.some((removed) => removed.toLowerCase() === name.toLowerCase());
  visit(document, {
    OperationDefinition(node) {
      if (node.name && named(node.name.value)) found.push(`${where}: operation ${node.name.value}`);
    },
    Field(node) {
      if (named(node.name.value)) found.push(`${where}: field ${node.name.value}`);
      if (node.name.value !== 'contributor') return;
      const fields = fieldsOf(node.selectionSet);
      for (const field of ['paused', 'pausedByYou']) {
        if (fields.includes(field)) found.push(`${where}: contributor { ${field} }`);
      }
      for (const selection of node.selectionSet?.selections ?? []) {
        if (selection.kind === Kind.FIELD && selection.name.value === 'settings') {
          if (fieldsOf(selection.selectionSet).includes('autopilot')) found.push(`${where}: settings { autopilot }`);
        }
      }
    },
  });
  return found;
}

/** `true` when `U` is one of `T`'s members. */
type Has<T, U> = U extends T ? true : false;

describe('the fields the API removes after this', () => {
  it('reads every document the pages send', async () => {
    const all = await documents();
    // The workspace's documents are among them, so an empty scan cannot pass.
    expect(all.some(({ where }) => where.startsWith('lib/workspace/contribute.documents.ts'))).toBe(true);
    expect(all.some(({ where }) => where.startsWith('lib/contribute/contribute-tab.documents.ts'))).toBe(true);
  });

  it('asks for no pause or resume, no paused or pausedByYou on contributor, and no autopilot setting', async () => {
    const found = (await documents()).flatMap(({ where, document }) => removedIn(where, document));
    expect(found).toEqual([]);
  });

  it('catches each of them', () => {
    const caught = removedIn(
      'probe',
      parse(`query ContributePaused { contribute { contributor { paused pausedByYou settings { pace autopilot } } } }
        mutation M { resumeContributing pauseContributing }`),
    );
    expect(caught).toEqual([
      'probe: operation ContributePaused',
      'probe: contributor { paused }',
      'probe: contributor { pausedByYou }',
      'probe: settings { autopilot }',
      'probe: field resumeContributing',
      'probe: field pauseContributing',
    ]);
    expect(removedIn('probe', parse('query Q { contribute { contributor { status settings { pace } } } }'))).toEqual(
      [],
    );
  });

  it('has a pace that is even or fast, read and sent', () => {
    const readQueued: Has<ContributePace, 'QUEUED'> = false;
    const sentQueued: Has<NonNullable<ContributeSettingsInput['pace']>, 'QUEUED'> = false;
    expect([readQueued, sentQueued]).toEqual([false, false]);
    expect(Object.keys(PACES).sort()).toEqual(['EVEN', 'FAST']);
  });
});
