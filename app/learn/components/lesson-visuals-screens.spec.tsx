import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonBlock } from './lesson-block';
import { VISUALS_STEP } from '@/lib/learn/__fixtures__/lesson';
import type { LessonBlock as Block } from '@/lib/learn/learn.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const blocks = VISUALS_STEP.blocks;
const sequence = blocks.find((block) => block.layout === 'SEQUENCE')!;
const flow = blocks.find((block) => block.type === 'DIAGRAM' && block.layout !== 'SEQUENCE')!;
const table = blocks.find((block) => block.type === 'TABLE')!;
const [codeCompare, diagramCompare] = blocks.filter((block) => block.type === 'COMPARE');
const draw = (block: Block, id = 's2-1') => renderToStaticMarkup(<LessonBlock block={block} id={id} />);

/** The markup between an element's opening tag that has `marker` and the first `close` after it. */
const inside = (html: string, marker: string, close: string) => {
  const at = html.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  return html.slice(at, html.indexOf(close, at));
};

describe("a lesson's arrow labels", () => {
  it('draws a label in a pill on its arrow, the arrow and its head in its tone', () => {
    const html = draw(flow, 's2-3');
    expect(html.match(/data-arrow-label=""/g)).toHaveLength(2);
    expect(html).toContain('>route.path</text>');
    expect(html).toMatch(/<rect[^>]*rx="9" fill="var\(--card\)" stroke="var\(--border\)"/);
    expect(html).toContain('font-size="11.5"');
    expect(html).toMatch(
      /data-edge="key&gt;miss" data-tone="WARN"|stroke="var\(--warning\)"[^>]*data-edge="key&gt;miss"/,
    );
    expect(html).toContain('id="arrow-s2-3-warn"');
    expect(html).toContain('marker-end="url(#arrow-s2-3-warn)"');
    expect(html).toContain('marker-end="url(#arrow-s2-3)"');
    expect(html).toMatch(
      /<svg[^>]*role="img"[^>]*aria-label="The key is the path as typed, so the second spelling misses."/,
    );
  });
});

describe('a call sequence', () => {
  it('draws actors with lifelines and one numbered row per call, a reply dashed, the changed call in the brand colour', () => {
    const html = draw(sequence);
    expect(html).toContain('data-block="diagram"');
    expect(html).toContain('data-diagram="sequence"');
    expect(html.match(/data-lifeline=/g)).toHaveLength(4);
    expect(html.match(/data-node=/g)).toHaveLength(4);
    expect(html.match(/data-call="/g)).toHaveLength(6);
    expect(html.match(/data-reply="true"/g)).toHaveLength(3);
    expect(html.match(/stroke-dasharray="5 4"/g)).toHaveLength(3);
    const accent = inside(html, 'data-call="2"', '</g></g>');
    expect(accent).toContain('stroke="var(--primary)"');
    expect(accent).toContain('fill="var(--primary)"');
    // A call's label in mono, a reply's in the text font.
    expect(inside(html, 'data-call="1"', '</g></g>')).toMatch(
      /font-family="JetBrains Mono, monospace"[^>]*>resolveLayouts\(route\)/,
    );
    expect(inside(html, 'data-call="3"', '</g></g>')).toMatch(
      /font-family="Inter, sans-serif"[^>]*>undefined: no entry/,
    );
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="One navigation to `\/docs`/);
    expect(text(html)).toContain(
      'One navigation to /docs : the lookup by the raw path misses, so every layout is built again.',
    );
  });

  it('reads its calls to a screen reader as an ordered list', () => {
    const list = inside(draw(sequence), '<ol class="sr-only">', '</ol>');
    expect(list.match(/<li>/g)).toHaveLength(6);
    expect(text(list)).toContain('Router calls resolveLayouts: resolveLayouts(route)');
    expect(text(list)).toContain('resolveLayouts calls layout cache: cache.get(route.path) (what the fix changed)');
    expect(text(list)).toContain('layout cache answers resolveLayouts: undefined: no entry');
  });

  it('keeps a pair of actors met again, which a flow diagram would drop', () => {
    const html = draw({ ...sequence, edges: [...(sequence.edges ?? []), sequence.edges![1]] });
    expect(html.match(/data-call="/g)).toHaveLength(7);
  });

  it('scales to its box on a desktop, and with four actors scrolls sideways below 520px on a phone', () => {
    const four = draw(sequence);
    expect(four).toMatch(
      /<div class="overflow-x-auto" data-sequence="4"><svg[^>]*style="width:100%;min-width:520px;max-width:680px/,
    );
    const three = draw({ ...sequence, nodes: sequence.nodes!.slice(0, 3) });
    expect(three).toMatch(/data-sequence="3"><svg[^>]*style="width:100%;max-width:680px/);
  });
});

describe('a before-and-after', () => {
  it('draws two code excerpts under Before and After, side by side from sm and stacked on a phone', () => {
    const html = draw(codeCompare);
    expect(html).toContain('data-block="compare"');
    expect(html).toContain('class="grid gap-4 sm:grid-cols-2" data-compare="CODE"');
    expect(text(inside(html, 'data-compare-side="before"', '</span>'))).toContain('Before');
    expect(text(inside(html, 'data-compare-side="after"', '</span>'))).toContain('After');
    expect(html).toMatch(/uppercase[^"]*">Before</);
    expect(text(html)).toContain('The key line before and after the fix.');
  });

  it('tints the lines only in one side as a diff does, and links only the before side to GitHub', () => {
    const html = draw(codeCompare);
    const before = inside(html, 'data-compare-side="before"', 'data-compare-side="after"');
    const after = html.slice(html.indexOf('data-compare-side="after"'));
    expect(before.match(/data-changed="del"/g)).toHaveLength(1);
    expect(before).toContain('bg-negative/10');
    expect(text(before)).toContain('const key = route.path (removed by the fix)');
    expect(after.match(/data-changed="add"/g)).toHaveLength(3);
    expect(after).toContain('bg-positive/10');
    expect(text(after)).toContain('if (hit) return hit (added by the fix)');
    expect(before).toContain(
      'href="https://github.com/driftwood-js/driftwood/blob/4f1c2ab9e7d3/src/router/layout-cache.ts#L40-L44"',
    );
    expect(after).not.toContain('href=');
    expect(text(after)).toContain('lines 40–46');
  });

  it('draws two small diagrams, each its own image named by the caption', () => {
    const html = draw(diagramCompare, 's2-5');
    expect(html).toContain('data-compare="DIAGRAM"');
    expect(html.match(/role="img"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Before: Two spellings: two entries before the fix, one after."');
    expect(html).toContain('aria-label="After: Two spellings: two entries before the fix, one after."');
    expect(html).toContain('id="arrow-s2-5-before"');
    expect(html).toContain('id="arrow-s2-5-after"');
    expect(html).toContain('fill="var(--warning-soft)"');
    expect(html).toContain('fill="var(--brand-soft)"');
    expect(html).toContain('>normalizePath</text>');
    // Each side scales to its pane.
    expect(html.match(/style="width:100%;max-width:\d+px;height:auto;display:block"/g)).toHaveLength(2);
  });

  it('draws nothing without sides, or of a kind it does not know', () => {
    expect(draw({ ...codeCompare, before: null, after: null })).not.toContain('data-compare=');
    expect(draw({ ...codeCompare, compareOf: 'CHART' as never })).not.toContain('data-compare=');
  });
});

describe('a table of cases', () => {
  it('draws its heads in small caps, its cells with code, and rings the row the step is about', () => {
    const html = draw(table);
    expect(html).toContain('data-block="table"');
    expect(html.match(/<th /g)).toHaveLength(3);
    expect(html).toMatch(/<th[^>]*uppercase[^>]*>Path typed<\/th>/);
    expect(html.match(/<tr /g)).toHaveLength(4);
    expect(html).toContain('<code');
    const ringed = inside(html, 'data-ring="true"', '</tr>');
    expect(html).toMatch(/<tr [^>]*class="[^"]*ring-1 ring-primary ring-inset[^"]*" data-ring="true">/);
    expect(text(ringed)).toContain('/docs (the case this step is about)');
    expect(html.match(/data-ring=/g)).toHaveLength(1);
    expect(html.match(/sr-only/g)).toHaveLength(1);
    expect(text(html)).toContain('Each spelling of the page is its own key.');
  });

  it('scrolls sideways in its own box below 520px', () => {
    const html = draw(table);
    expect(html).toMatch(
      /data-slot="table-container" class="[^"]*overflow-x-auto[^"]*"><table[^>]*class="[^"]*min-w-\[520px\]/,
    );
    expect(html).toContain('whitespace-normal');
  });

  it('rings nothing without a ring, and draws nothing without rows', () => {
    expect(draw({ ...table, ring: null })).not.toContain('data-ring=');
    expect(draw({ ...table, rows: [] })).toBe('');
  });
});

describe('a block type this page does not know', () => {
  it('draws nothing, so a page loaded before a new type ships skips it', () => {
    expect(draw({ ...table, type: 'CHART' } as unknown as Block)).toBe('');
  });
});
