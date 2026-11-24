// A page rendered ahead of a request may not read the clock or a random value: the build stops at the first one. The
// build's prerender step does not run locally, so this check finds the two shapes that read one as soon as a module
// is imported or a function is called with its defaults, in `lib/`, `components/` and `app/`:
//
// - a default parameter (`function f(now = Date.now())`, `({ id = crypto.randomUUID() })`), read on every call that
//   leaves the argument out, a prerendered page's call included;
// - a module-level statement (`const startedAt = Date.now()`), read when the module is imported, by the build too.
//
// The reads are those Next.js refuses while prerendering: `Date.now()`, `Date()`, `new Date()` with no argument,
// `Math.random()`, `crypto.randomUUID()` and `crypto.getRandomValues()`, each also through `globalThis` or a type
// assertion, and Node's `randomUUID`, `randomBytes`, `randomInt` and `getRandomValues` imported from `crypto` or
// `node:crypto`. A read inside a function's body, or in a field set per instance, is the caller's to place (after
// `await connection()`, or inside a cached read); a function called where it is written runs its body there, so its
// reads are placed with the call. A default parameter of a function whose body starts with `'use cache'` is read
// inside the cached call. Files marked `'use client'`, specs, tests and fixtures are not checked. A class whose fields
// read one, made with `new` in another file, is not followed.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The reads, by the name a call is made through (`globalThis.` dropped). */
const CALL_READS = {
  'Date.now': 'the clock',
  Date: 'the clock',
  'Math.random': 'a random value',
  'crypto.randomUUID': 'a random value',
  'crypto.getRandomValues': 'a random value',
};

/** Node's `crypto` functions that read a random value, by the name they are exported as. */
const NODE_RANDOM = new Set(['randomUUID', 'randomBytes', 'randomInt', 'getRandomValues']);

/** The names Node's `crypto` is imported from. */
const NODE_CRYPTO = new Set(['crypto', 'node:crypto']);

/** Expressions that only wrap another: parentheses, an optional chain, a type assertion. */
const WRAPPERS = new Set([
  'ChainExpression',
  'ParenthesizedExpression',
  'TSNonNullExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
]);

/** Whether a file is checked: source under the three folders, not a spec, a test or a fixture. */
export const isChecked = (path) =>
  /^(?:lib|components|app)\//.test(path) &&
  /\.[cm]?[jt]sx?$/.test(path) &&
  !/\.d\.[cm]?ts$/.test(path) &&
  !/\.(?:spec|test|fixtures?)\.[cm]?[jt]sx?$/.test(path) &&
  !/(?:^|\/)__(?:fixtures|mocks)__\//.test(path);

/** The name an expression is reached through (`Date.now`, `crypto.randomUUID`), without `globalThis.`; null otherwise. */
export function nameOf(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (WRAPPERS.has(node.type)) return nameOf(node.expression);
  if (node.type !== 'MemberExpression') return null;
  const object = nameOf(node.object);
  const property = node.computed
    ? node.property.type === 'Literal' && typeof node.property.value === 'string'
      ? node.property.value
      : null
    : node.property.name;
  if (!object || !property) return null;
  return object === 'globalThis' ? property : `${object}.${property}`;
}

/**
 * The names a program imports Node's random functions under: `named` maps a local name to the function
 * (`import { randomUUID as id } from 'node:crypto'`), `modules` holds the names the whole module is imported as.
 */
export function cryptoImportsOf(program) {
  const named = new Map();
  const modules = new Set();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || !NODE_CRYPTO.has(statement.source.value)) continue;
    if (statement.importKind === 'type') continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier') {
        modules.add(specifier.local.name);
        continue;
      }
      const imported = specifier.imported.name ?? specifier.imported.value;
      if (NODE_RANDOM.has(imported) && specifier.importKind !== 'type') named.set(specifier.local.name, imported);
    }
  }
  return { named, modules };
}

const NO_IMPORTS = { named: new Map(), modules: new Set() };

/** What a node reads, as written in the message (`Date.now()`), or null when it reads neither the clock nor chance. */
export function readOf(node, imports = NO_IMPORTS) {
  if (node.type === 'NewExpression' && nameOf(node.callee) === 'Date' && node.arguments.length === 0) {
    return { what: 'new Date()', reads: 'the clock' };
  }
  if (node.type !== 'CallExpression') return null;
  const name = nameOf(node.callee);
  if (!name) return null;
  if (imports.named.has(name)) return { what: `${imports.named.get(name)}()`, reads: 'a random value' };
  const [object, property, ...rest] = name.split('.');
  if (imports.modules.has(object) && NODE_RANDOM.has(property) && !rest.length) {
    return { what: `${name}()`, reads: 'a random value' };
  }
  if (!Object.hasOwn(CALL_READS, name)) return null;
  return { what: `${name}()`, reads: CALL_READS[name] };
}

const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/** Whether a function's body starts with `'use cache'` (or one of its kinds, as `'use cache: remote'`). */
const isCached = (fn) =>
  fn.body?.type === 'BlockStatement' &&
  fn.body.body.some(
    (statement) =>
      statement.type === 'ExpressionStatement' &&
      typeof statement.directive === 'string' &&
      /^use cache(?::|$)/.test(statement.directive),
  );

/** Whether the function at `ancestors[index]` is called (or made with `new`) right where it is written. */
function isCalledInPlace(ancestors, index) {
  let fn = ancestors[index];
  for (let at = index - 1; at >= 0; at -= 1) {
    const parent = ancestors[at];
    if (!WRAPPERS.has(parent.type)) {
      return (parent.type === 'CallExpression' || parent.type === 'NewExpression') && parent.callee === fn;
    }
    fn = parent;
  }
  return false;
}

/**
 * Where a read with these ancestors (the file's root first) runs: `default` in a function's default parameter,
 * `module` when the module is imported, null inside a function's body or a field set per instance. The body and the
 * defaults of a function called where it is written run where that call does.
 */
export function placeOf(ancestors, node) {
  let child = node;
  let inDefault = false;
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (parent.type === 'AssignmentPattern' && parent.right === child) inDefault = true;
    if (FUNCTIONS.has(parent.type)) {
      const inPlace = isCalledInPlace(ancestors, index);
      if (parent.body === child && !inPlace) return null;
      if (parent.params.includes(child)) {
        if (!inDefault || isCached(parent)) return null;
        if (!inPlace) return 'default';
      }
      inDefault = false;
    }
    // A class's own field is set on each `new`; a static one when the class is defined, with the module.
    if ((parent.type === 'PropertyDefinition' || parent.type === 'AccessorProperty') && parent.value === child) {
      if (!parent.static) return null;
    }
    child = parent;
  }
  return 'module';
}

const FIXES = {
  default:
    'take the value as an argument the caller passes, or read it in the body of a function only called after `await connection()` or inside a cached read',
  module: 'read it inside the function that needs it, called after `await connection()` or inside a cached read',
};

/** Whether a program is marked `'use client'` among its leading directives. */
const isClient = (program) =>
  program.body.some((statement) => statement.type === 'ExpressionStatement' && statement.directive === 'use client');

/** The parser's language for a file, by its extension. */
export const langOf = (file) => /\.[cm]?([jt]sx?)$/.exec(file)?.[1] ?? 'js';

/** The line (from 1) of an offset in a source. */
const lineOf = (source, offset) => source.slice(0, offset).split('\n').length;

/**
 * The problems of one file, as `<file>:<line>: <read> in a default parameter|at module level reads <what>. ...`: none
 * for a client file. `parse` takes the source and the language and gives an ESTree program.
 */
export function problemsOf(file, source, parse) {
  const program = parse(source, { lang: langOf(file) });
  if (isClient(program)) return [];
  const imports = cryptoImportsOf(program);
  const problems = [];
  const ancestors = [];
  const visit = (node) => {
    const read = readOf(node, imports);
    const place = read && placeOf(ancestors, node);
    if (place) {
      const where = place === 'default' ? 'in a default parameter' : 'at module level';
      problems.push(
        `${file}:${lineOf(source, node.start)}: ${read.what} ${where} reads ${read.reads}, which a page rendered ahead of a request may not do. Fix: ${FIXES[place]}.`,
      );
    }
    ancestors.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        if (child && typeof child === 'object' && typeof child.type === 'string') visit(child);
      }
    }
    ancestors.pop();
  };
  visit(program);
  return problems;
}

function filesUnder(root, dir) {
  let entries;
  try {
    entries = readdirSync(join(root, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { parseAst } = await import('vitest/node');
  const root = relative(process.cwd(), fileURLToPath(new URL('..', import.meta.url))) || '.';
  const files = ['lib', 'components', 'app'].flatMap((dir) => filesUnder(root, dir)).filter(isChecked);
  const problems = files.flatMap((file) => problemsOf(file, readFileSync(join(root, file), 'utf8'), parseAst));
  for (const problem of problems) console.error(`check-prerender-reads: ${problem}`);
  console.log(`check-prerender-reads: ${files.length} files, ${problems.length} reads of the clock or chance`);
  if (problems.length) process.exit(1);
}
