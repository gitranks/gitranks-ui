// A page rendered ahead of a request may not read the clock or a random value: the build stops at the first one. The
// build's prerender step does not run locally, so this check finds the two shapes that read one as soon as a module
// is imported or a function is called with its defaults, in `lib/`, `components/` and `app/`:
//
// - a default parameter (`function f(now = Date.now())`, `({ id = crypto.randomUUID() })`), read on every call that
//   leaves the argument out, a prerendered page's call included;
// - a module-level statement (`const startedAt = Date.now()`), read when the module is imported, by the build too.
//
// The reads are those Next.js refuses while prerendering: `Date.now()`, `Date()`, `new Date()` with no argument,
// `Math.random()`, `crypto.randomUUID()` and `crypto.getRandomValues()`, each also through `globalThis`. A read inside
// a function's body, or in a field set per instance, is the caller's to place (after `await connection()`, or inside
// a cached read). Files marked `'use client'`, specs, tests and fixtures are not checked.
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
  if (node.type === 'ChainExpression' || node.type === 'TSNonNullExpression' || node.type === 'ParenthesizedExpression')
    return nameOf(node.expression);
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

/** What a node reads, as written in the message (`Date.now()`), or null when it reads neither the clock nor chance. */
export function readOf(node) {
  if (node.type === 'NewExpression' && nameOf(node.callee) === 'Date' && node.arguments.length === 0) {
    return { what: 'new Date()', reads: 'the clock' };
  }
  if (node.type !== 'CallExpression') return null;
  const name = nameOf(node.callee);
  if (!name || !Object.hasOwn(CALL_READS, name)) return null;
  return { what: `${name}()`, reads: CALL_READS[name] };
}

const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/**
 * Where a read with these ancestors (the file's root first) runs: `default` in a function's default parameter,
 * `module` when the module is imported, null inside a function's body or a field set per instance.
 */
export function placeOf(ancestors, node) {
  let child = node;
  let inDefault = false;
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (parent.type === 'AssignmentPattern' && parent.right === child) inDefault = true;
    if (FUNCTIONS.has(parent.type)) {
      if (parent.body === child) return null;
      if (parent.params.includes(child)) return inDefault ? 'default' : null;
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
  const problems = [];
  const ancestors = [];
  const visit = (node) => {
    const read = readOf(node);
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
