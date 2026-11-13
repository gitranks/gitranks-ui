import { describe, expect, it } from 'vitest';

import { cleanDiagram, DIAGRAM_WIDTH, type DiagramBox, layoutDiagram } from './diagram-layout';
import type { LessonDiagramEdge, LessonDiagramNode } from './learn.types';

const node = (id: string, extra: Partial<LessonDiagramNode> = {}): LessonDiagramNode => ({
  id,
  label: id,
  sub: null,
  tone: 'PLAIN',
  mono: false,
  ...extra,
});
const edge = (from: string, to: string): LessonDiagramEdge => ({ from, to });

const overlap = (a: DiagramBox, b: DiagramBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Every box inside the drawing, and no two on top of each other. */
function expectTidy(layout: ReturnType<typeof layoutDiagram>) {
  for (const box of layout.boxes) {
    expect(box.x, box.id).toBeGreaterThanOrEqual(0);
    expect(box.y, box.id).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w, box.id).toBeLessThanOrEqual(layout.width);
    expect(box.y + box.h, box.id).toBeLessThanOrEqual(layout.height);
  }
  for (const [index, a] of layout.boxes.entries()) {
    for (const b of layout.boxes.slice(index + 1)) expect(overlap(a, b), `${a.id} and ${b.id}`).toBe(false);
  }
}

const box = (layout: ReturnType<typeof layoutDiagram>, id: string) => layout.boxes.find((one) => one.id === id)!;

describe('a lesson diagram', () => {
  it('keeps each node once, at most 8, and only the edges that join two of them, once each, at most 10', () => {
    const nodes = [...'abcdefghij'].map((id) => node(id));
    const { nodes: kept, edges } = cleanDiagram(
      [...nodes, node('a', { label: 'again' })],
      [
        edge('a', 'b'),
        edge('a', 'b'),
        edge('a', 'a'),
        edge('a', 'zz'),
        edge('i', 'a'),
        ...nodes.map(() => edge('b', 'c')),
      ],
    );
    expect(kept.map(({ id }) => id)).toEqual([...'abcdefgh']);
    expect(kept[0].label).toBe('a');
    expect(edges).toEqual([edge('a', 'b'), edge('b', 'c')]);

    const many = [...'abcdefgh'].flatMap((from) => [...'abcdefgh'].map((to) => edge(from, to)));
    expect(cleanDiagram(nodes, many).edges).toHaveLength(10);
  });

  it('draws nothing without nodes', () => {
    expect(layoutDiagram([], [])).toMatchObject({ boxes: [], arrows: [], height: 0 });
    expect(layoutDiagram(null, null).boxes).toEqual([]);
  });

  it('lays a fan left to right in layers, the middle box between the two that point to it', () => {
    // Two spellings of one route, one cache key, two entries: the drawing of the lesson's step 2.
    const layout = layoutDiagram(
      [
        node('a', { label: '/docs/', mono: true }),
        node('b', { label: '/docs', mono: true }),
        node('key', { label: 'cache key = route.path', sub: 'the raw text of the path', tone: 'ACCENT' }),
        node('one', { label: '"/docs/"', sub: 'entry 1: layouts built', mono: true }),
        node('two', { label: '"/docs"', sub: 'no entry: built again', mono: true, tone: 'WARN' }),
      ],
      [edge('a', 'key'), edge('b', 'key'), edge('key', 'one'), edge('key', 'two')],
    );

    expect(layout.direction).toBe('across');
    expect(layout.width).toBe(DIAGRAM_WIDTH);
    expect(layout.boxes.map(({ id, layer }) => [id, layer])).toEqual([
      ['a', 0],
      ['b', 0],
      ['key', 1],
      ['one', 2],
      ['two', 2],
    ]);
    expect(box(layout, 'a').x).toBeLessThan(box(layout, 'key').x);
    expect(box(layout, 'key').x + box(layout, 'key').w).toBeLessThan(box(layout, 'one').x);
    // The middle box sits between the two before it.
    const centre = (id: string) => box(layout, id).y + box(layout, id).h / 2;
    expect(centre('key')).toBeCloseTo((centre('a') + centre('b')) / 2, 0);
    // A box with a line under its label is taller.
    expect(box(layout, 'one').h).toBeGreaterThan(box(layout, 'a').h);
    expectTidy(layout);
    // Arrows run from a box's right side to the next one's left, never back.
    expect(layout.arrows.every(({ back }) => !back)).toBe(true);
    const keyBox = box(layout, 'key');
    expect(layout.arrows[2].d.startsWith(`M${keyBox.x + keyBox.w} `)).toBe(true);
  });

  it('puts a box after the furthest box that points to it', () => {
    const layout = layoutDiagram([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c'), edge('a', 'c')]);
    expect(layout.boxes.map(({ layer }) => layer)).toEqual([0, 1, 2]);
    expectTidy(layout);
  });

  it('orders a layer by the boxes it comes from, so arrows do not cross', () => {
    // b2 is listed first but comes from a2, the lower of the two sources.
    const layout = layoutDiagram(
      [node('a1'), node('a2'), node('b2'), node('b1')],
      [edge('a1', 'b1'), edge('a2', 'b2')],
    );
    expect(box(layout, 'b1').y).toBeLessThan(box(layout, 'b2').y);
  });

  it('goes top to bottom when there are more layers than fit across, and stays inside the drawing', () => {
    const ids = [...'abcdef'];
    const layout = layoutDiagram(
      ids.map((id) => node(id, { label: `step ${id} of the chain` })),
      ids.slice(1).map((id, index) => edge(ids[index], id)),
    );
    expect(layout.direction).toBe('down');
    expect(layout.boxes.map(({ layer }) => layer)).toEqual([0, 1, 2, 3, 4, 5]);
    for (let index = 1; index < ids.length; index++) {
      expect(layout.boxes[index].y).toBeGreaterThan(layout.boxes[index - 1].y + layout.boxes[index - 1].h);
    }
    expectTidy(layout);
  });

  it('lays boxes with no arrows between them in one row', () => {
    const layout = layoutDiagram([node('a'), node('b'), node('c')], []);
    expect(layout.direction).toBe('down');
    expect(new Set(layout.boxes.map(({ y }) => y)).size).toBe(1);
    expectTidy(layout);
  });

  it('draws a loop: the arrow back runs around the outside, and the layout ends', () => {
    const layout = layoutDiagram([node('a'), node('b'), node('c')], [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]);
    expect(layout.boxes.map(({ layer }) => layer)).toEqual([0, 1, 2]);
    const back = layout.arrows.filter((arrow) => arrow.back);
    expect(back).toEqual([expect.objectContaining({ from: 'c', to: 'a' })]);
    expect(back[0].d).toContain('C');
    // Room under the boxes for it.
    expect(layout.height).toBeGreaterThan(Math.max(...layout.boxes.map(({ y, h }) => y + h)) + 30);
    expectTidy(layout);
  });

  it('cuts a label too long for the widest box, keeping the whole text for its title', () => {
    const long = 'a label far too long to fit in any box of the diagram at all';
    const layout = layoutDiagram([node('a', { label: long }), node('b')], [edge('a', 'b')]);
    const a = box(layout, 'a');
    expect(a.label.endsWith('…')).toBe(true);
    expect(a.label.length).toBeLessThan(long.length);
    expect(a.title).toBe(long);
    expect(a.w).toBeLessThanOrEqual(220);
    expect(a.w).toBeGreaterThan(200);
    expect(box(layout, 'b').title).toBeNull();
  });
});
