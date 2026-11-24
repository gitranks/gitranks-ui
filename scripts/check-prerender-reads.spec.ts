import { describe, expect, it } from 'vitest';
import { parseAst } from 'vitest/node';

import { isChecked, langOf, problemsOf } from './check-prerender-reads.mjs';

const problems = (source: string, file = 'lib/x/y.ts') => problemsOf(file, source, parseAst);

describe('the prerender reads guard', () => {
  it('checks source under lib/, components/ and app/, not specs, tests, fixtures or other folders', () => {
    expect(isChecked('lib/workspace/preview-gate.ts')).toBe(true);
    expect(isChecked('components/share/share-button.tsx')).toBe(true);
    expect(isChecked('app/(learn)/learn/page.tsx')).toBe(true);
    expect(isChecked('app/llms.txt/route.ts')).toBe(true);
    expect(isChecked('lib/x/thing.mjs')).toBe(true);
    expect(isChecked('lib/workspace/preview-gate.spec.ts')).toBe(false);
    expect(isChecked('components/share/share-button.spec.tsx')).toBe(false);
    expect(isChecked('lib/x/y.test.ts')).toBe(false);
    expect(isChecked('lib/workspace/__fixtures__/pull-request.ts')).toBe(false);
    expect(isChecked('components/pulse/pulse.fixtures.ts')).toBe(false);
    expect(isChecked('lib/x/__mocks__/y.ts')).toBe(false);
    expect(isChecked('types/generated/graphql.d.ts')).toBe(false);
    expect(isChecked('lib/x/y.d.ts')).toBe(false);
    expect(isChecked('scripts/check-prerender-reads.mjs')).toBe(false);
    expect(isChecked('utils/format.ts')).toBe(false);
    expect(isChecked('app/globals.css')).toBe(false);
  });

  it('parses a file in its own language', () => {
    expect(langOf('a/b.ts')).toBe('ts');
    expect(langOf('a/b.tsx')).toBe('tsx');
    expect(langOf('a/b.mjs')).toBe('js');
    expect(langOf('a/b.jsx')).toBe('jsx');
    expect(problems('export const A = ({ n }: { n: number }) => <p>{n}</p>;', 'components/a.tsx')).toEqual([]);
  });

  it('finds the clock and chance in a default parameter, with the line, the read and the fix', () => {
    const found = problems(
      [
        'export function contributeOpen(now = Date.now()) {}',
        'export const label = (iso: string, now: Date = new Date()) => iso;',
        'export function pick({ id = crypto.randomUUID() }: { id?: string }) {}',
        'class A { constructor(private seed = Math.random()) {} }',
        'const o = { at(now = globalThis.Date.now()) {} };',
      ].join('\n'),
    );
    expect(found).toHaveLength(5);
    expect(found[0]).toBe(
      'lib/x/y.ts:1: Date.now() in a default parameter reads the clock, which a page rendered ahead of a request may not do. Fix: take the value as an argument the caller passes, or read it in the body of a function only called after `await connection()` or inside a cached read.',
    );
    expect(found.map((line) => line.split(' in a ')[0])).toEqual([
      'lib/x/y.ts:1: Date.now()',
      'lib/x/y.ts:2: new Date()',
      'lib/x/y.ts:3: crypto.randomUUID()',
      'lib/x/y.ts:4: Math.random()',
      'lib/x/y.ts:5: Date.now()',
    ]);
    expect(found[2]).toContain('reads a random value');
  });

  it('finds the clock and chance at module level, a static field and a destructured default among them', () => {
    const found = problems(
      [
        'const STARTED = Date.now();',
        'export const id = globalThis.crypto.getRandomValues(new Uint8Array(4));',
        'const stamp = String(Date());',
        'const { at = new Date() } = {} as { at?: Date };',
        'class B { static made = new globalThis.Date(); }',
        "if (Math.random() > 0.5) console.log('x');",
      ].join('\n'),
    );
    expect(found.map((line) => line.split(' reads ')[0])).toEqual([
      'lib/x/y.ts:1: Date.now() at module level',
      'lib/x/y.ts:2: crypto.getRandomValues() at module level',
      'lib/x/y.ts:3: Date() at module level',
      'lib/x/y.ts:4: new Date() at module level',
      'lib/x/y.ts:5: new Date() at module level',
      'lib/x/y.ts:6: Math.random() at module level',
    ]);
    expect(found[0]).toContain('Fix: read it inside the function that needs it');
  });

  it("leaves a read in a function's body, a field set per instance, and a default that is a function", () => {
    expect(
      problems(
        [
          'export function f(at?: number) { const now = at ?? Date.now(); return now; }',
          'export const g = () => new Date();',
          'export const h = (make = () => Math.random()) => make();',
          'class C { made = Date.now(); m() { return new Date(); } }',
          "export const fixed = new Date('2026-11-24T00:00:00Z');",
          'export const later = (ms: number) => new Date(Date.now() + ms);',
          'export const k = async () => { const { at = Date.now() } = {} as { at?: number }; return at; };',
        ].join('\n'),
      ),
    ).toEqual([]);
  });

  it("leaves reads that are not the clock's or chance's: a date from a value, another object's now, performance.now()", () => {
    expect(
      problems(
        [
          'const parsed = new Date(0);',
          'const clock = { now: () => 1 };',
          'const t = clock.now();',
          'const p = performance.now();',
          'const r = random();',
          'function random() { return 4; }',
        ].join('\n'),
      ),
    ).toEqual([]);
  });

  it('finds a read in the body or a default of a function called where it is written, at module level', () => {
    const found = problems(
      [
        'export const x = (() => Date.now())();',
        'export const y = (function () { return Math.random(); })();',
        'const w = ((now = Date.now()) => now)();',
        'const v = (async () => { await 0; return Date.now(); })();',
        'const u = (<T,>(make: () => T) => make)(() => Date.now());',
      ].join('\n'),
      'lib/x/y.tsx',
    );
    expect(found.map((line) => line.split(' reads ')[0])).toEqual([
      'lib/x/y.tsx:1: Date.now() at module level',
      'lib/x/y.tsx:2: Math.random() at module level',
      'lib/x/y.tsx:3: Date.now() at module level',
      'lib/x/y.tsx:4: Date.now() at module level',
    ]);
  });

  it('finds a read reached through a type assertion', () => {
    const found = problems(
      [
        'const a = (Date as DateConstructor).now();',
        'const b = (Math satisfies Math).random();',
        'const c = (<Crypto>crypto).randomUUID();',
        'const d = crypto!.getRandomValues(new Uint8Array(2));',
        'export function f(now = (Date as DateConstructor)()) {}',
      ].join('\n'),
    );
    expect(found.map((line) => line.split(' reads ')[0])).toEqual([
      'lib/x/y.ts:1: Date.now() at module level',
      'lib/x/y.ts:2: Math.random() at module level',
      'lib/x/y.ts:3: crypto.randomUUID() at module level',
      'lib/x/y.ts:4: crypto.getRandomValues() at module level',
      'lib/x/y.ts:5: Date() in a default parameter',
    ]);
  });

  it("finds Node's random functions imported from crypto, by name or with the module", () => {
    const found = problems(
      [
        "import { randomUUID, randomBytes as bytes, createHash } from 'node:crypto';",
        "import nodeCrypto, * as all from 'crypto';",
        "import type { randomInt } from 'node:crypto';",
        'const a = randomUUID();',
        'const b = bytes(8);',
        'const c = nodeCrypto.randomInt(4);',
        'const d = all.getRandomValues(new Uint8Array(2));',
        "const e = createHash('sha1');",
        'export function f(id = randomUUID()) {}',
        'export function g() { return bytes(4); }',
      ].join('\n'),
    );
    expect(found.map((line) => line.split(' reads ')[0])).toEqual([
      'lib/x/y.ts:4: randomUUID() at module level',
      'lib/x/y.ts:5: randomBytes() at module level',
      'lib/x/y.ts:6: nodeCrypto.randomInt() at module level',
      'lib/x/y.ts:7: all.getRandomValues() at module level',
      'lib/x/y.ts:9: randomUUID() in a default parameter',
    ]);
    // Without the import, a function of that name is the file's own.
    expect(problems('const a = randomUUID();\nfunction randomUUID() { return 1; }')).toEqual([]);
  });

  it("leaves a default parameter of a function whose body starts with 'use cache'", () => {
    expect(
      problems(
        [
          "export async function a(now = Date.now()) { 'use cache'; return now; }",
          "export const b = async (at = new Date()) => { 'use cache: remote'; return at; };",
        ].join('\n'),
      ),
    ).toEqual([]);
    expect(
      problems("export async function c(now = Date.now()) { const mark = 'use cache'; return now; }"),
    ).toHaveLength(1);
  });

  it("leaves a file marked 'use client', and checks one marked 'use server' or 'use cache'", () => {
    expect(problems("'use client';\n\nconst A = Date.now();\nexport function f(now = Date.now()) {}")).toEqual([]);
    expect(problems("'use server';\nexport async function f(now = Date.now()) {}")).toHaveLength(1);
    expect(problems("'use cache';\nconst A = Math.random();")).toHaveLength(1);
    // The words in a string, not a directive.
    expect(problems("const mark = 'use client';\nconst A = Date.now();")).toHaveLength(1);
  });
});
