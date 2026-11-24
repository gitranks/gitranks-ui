import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type DocumentNode, Kind, parse, type SelectionSetNode, visit } from 'graphql';
import { describe, expect, it, vi } from 'vitest';

import type { ContributePace, ContributeSettingsInput } from './contribute.types';
import { PACES } from './format';

/**
 * What the pages no longer ask the API for, now that a pause is lifted only by fixing the key and starting issues is
 * the hosted agent's level: no operation pauses or resumes contributing or reads the pause, no `contributor` selects
 * `paused` or `pausedByYou`, no settings select or send `autopilot`, a pace is even or fast, and nothing reads a
 * person's old Learn record (`learnRecord`, `learnPublicProgress`). The API removes these once this holds on the main
 * branch, so this spec is that gate: it reads every document the pages send.
 *
 * "Every document": each one `graphql`'s `parse` builds when its module loads (every source file that imports `parse`
 * is loaded here, so a document need not be exported, nor live in a `*.documents.ts`), and each `.gql` file.
 */

const parsed = vi.hoisted(() => ({ documents: [] as DocumentNode[] }));
vi.mock('graphql', async (load) => {
  const graphql = await load<typeof import('graphql')>();
  return {
    ...graphql,
    parse: (...args: Parameters<typeof graphql.parse>) => {
      const document = graphql.parse(...args);
      parsed.documents.push(document);
      return document;
    },
  };
});
// What the modules that build documents import beside them, and that needs a request or a server.
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));

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

const IMPORTS_PARSE = /import\s*\{[^}]*\bparse\b[^}]*\}\s*from\s*['"]graphql['"]/;

/** The source files (specs aside) that import `graphql`'s `parse`: the ones that build documents. */
const buildersOf = () =>
  filesUnder(ROOT, ['.ts', '.tsx'])
    .filter((path) => !/\.spec\.tsx?$/.test(path) && !path.endsWith('.d.ts'))
    .filter((path) => IMPORTS_PARSE.test(readFileSync(path, 'utf8')));

type Found = { where: string; document: DocumentNode };

let loaded: Promise<Found[]> | null = null;

/** Every document the pages send, each named by its operations. */
function documents(): Promise<Found[]> {
  loaded ??= (async () => {
    const found: Found[] = [];
    for (const path of buildersOf()) {
      const from = parsed.documents.length;
      // Fresh, so a document another builder loaded first is counted under its own file too.
      vi.resetModules();
      await import(path);
      for (const document of parsed.documents.slice(from)) found.push({ where: whereOf(path, document), document });
    }
    for (const path of filesUnder(ROOT, ['.gql', '.graphql'])) {
      found.push({ where: relative(ROOT, path), document: parse(readFileSync(path, 'utf8')) });
    }
    return found;
  })();
  return loaded;
}

const whereOf = (path: string, document: DocumentNode) => {
  const names = document.definitions.flatMap((node) =>
    node.kind === Kind.OPERATION_DEFINITION && node.name ? [node.name.value] : [],
  );
  return `${relative(ROOT, path)} ${names.join(', ') || '(unnamed)'}`;
};

const REMOVED_OPERATIONS = [
  'pauseContributing',
  'resumeContributing',
  'ContributePaused',
  'learnRecord',
  'learnPublicProgress',
];
/** The fields whose selection is the contributor's settings. */
const SETTINGS_FIELDS = ['settings', 'contributeSettings', 'setContributeSettings'];
/** The mutations that send settings, where an `autopilot` field or a `QUEUED` pace would go. */
const SETTINGS_WRITES = ['setContributeSettings', 'connectClaudeKey'];

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

/** What a document still asks for or sends of the removed fields, as `<where>: <what>` lines. */
function removedIn(where: string, document: DocumentNode): string[] {
  const found: string[] = [];
  const named = (name: string) => REMOVED_OPERATIONS.some((removed) => removed.toLowerCase() === name.toLowerCase());
  visit(document, {
    OperationDefinition(node) {
      if (node.name && named(node.name.value)) found.push(`${where}: operation ${node.name.value}`);
    },
    Field(node) {
      const name = node.name.value;
      if (named(name)) found.push(`${where}: field ${name}`);
      const fields = fieldsOf(node.selectionSet);
      if (name === 'contributor') {
        for (const field of ['paused', 'pausedByYou']) {
          if (fields.includes(field)) found.push(`${where}: contributor { ${field} }`);
        }
      }
      if (SETTINGS_FIELDS.includes(name) && fields.includes('autopilot')) {
        found.push(`${where}: ${name} { autopilot }`);
      }
      if (SETTINGS_WRITES.includes(name)) {
        for (const argument of node.arguments ?? []) {
          visit(argument.value, {
            ObjectField(field) {
              if (field.name.value === 'autopilot') found.push(`${where}: ${name}(… autopilot: …)`);
            },
            EnumValue(value) {
              if (value.value === 'QUEUED') found.push(`${where}: ${name}(… QUEUED …)`);
            },
          });
        }
      }
    },
  });
  return found;
}

/** `true` when `U` is one of `T`'s members. */
type Has<T, U> = U extends T ? true : false;

describe('the fields the API removes after this', () => {
  it('reads every document the pages send, wherever it is built', async () => {
    const all = await documents();
    const from = (path: string) => all.some(({ where }) => where.startsWith(`${path} `));
    // Documents files, and documents built elsewhere and not exported, are among them: an empty scan cannot pass.
    expect(from('lib/workspace/contribute.documents.ts')).toBe(true);
    expect(from('lib/contribute/contribute-tab.documents.ts')).toBe(true);
    expect(from('lib/learn/learn-bar.data.ts')).toBe(true);
    expect(all.some(({ where }) => where === 'lib/contribute/agent-page.ts ContributeAgentPage')).toBe(true);
    // Every file that builds documents gave at least one.
    for (const path of buildersOf()) {
      if (path.endsWith('reject-not-allowed-graphql-operations.ts')) continue; // parses what it is sent, at call time
      expect(from(relative(ROOT, path)), relative(ROOT, path)).toBe(true);
    }
  });

  it('asks for no pause or resume, no paused or pausedByYou on contributor, no autopilot setting, no Learn record', async () => {
    const found = (await documents()).flatMap(({ where, document }) => removedIn(where, document));
    expect(found).toEqual([]);
  });

  it('catches each of them', () => {
    const caught = removedIn(
      'probe',
      parse(`query ContributePaused { contribute { contributor { paused pausedByYou settings { pace autopilot } } } }
        mutation M { resumeContributing pauseContributing }
        query S { contributeSettings { autopilot } }
        mutation W { setContributeSettings(settings: { autopilot: true, pace: QUEUED }) { autopilot } }
        mutation K { connectClaudeKey(input: { limits: { pace: QUEUED } }) { result } }
        query LearnRecord { learnRecord(login: "a") { lessons } }
        query P { learnPublicProgress(login: "a") { total } }`),
    );
    expect(caught).toEqual([
      'probe: operation ContributePaused',
      'probe: contributor { paused }',
      'probe: contributor { pausedByYou }',
      'probe: settings { autopilot }',
      'probe: field resumeContributing',
      'probe: field pauseContributing',
      'probe: contributeSettings { autopilot }',
      'probe: setContributeSettings { autopilot }',
      'probe: setContributeSettings(… autopilot: …)',
      'probe: setContributeSettings(… QUEUED …)',
      'probe: connectClaudeKey(… QUEUED …)',
      'probe: operation LearnRecord',
      'probe: field learnRecord',
      'probe: field learnPublicProgress',
    ]);
    const clean = `query Q { contribute { contributor { status settings { pace } } } }
      mutation W($settings: ContributeSettingsInput!) { setContributeSettings(settings: $settings) { pace } }
      query R { contributeAttempt(id: "A") { state attempts(state: QUEUED) { autopilot } } }`;
    expect(removedIn('probe', parse(clean))).toEqual([]);
  });

  it('has a pace that is even or fast, read and sent', () => {
    const readQueued: Has<ContributePace, 'QUEUED'> = false;
    const sentQueued: Has<NonNullable<ContributeSettingsInput['pace']>, 'QUEUED'> = false;
    expect([readQueued, sentQueued]).toEqual([false, false]);
    expect(Object.keys(PACES).sort()).toEqual(['EVEN', 'FAST']);
  });
});
