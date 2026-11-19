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
const edge = (from: string, to: string, extra: Partial<LessonDiagramEdge> = {}): LessonDiagramEdge => ({
  from,
  to,
  label: null,
  reply: false,
  tone: 'PLAIN',
  ...extra,
});

const overlap = (a: DiagramBox, b: DiagramBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A label's pill as a box, to test it against the boxes and the other labels. */
const pillBoxes = (layout: ReturnType<typeof layoutDiagram>) =>
  layout.arrows.flatMap(({ from, to, label }) =>
    label
      ? [
          {
            id: `${from}>${to}`,
            x: label.x - label.w / 2,
            y: label.y - label.h / 2,
            w: label.w,
            h: label.h,
          } as DiagramBox,
        ]
      : [],
  );

/** Every box and label inside the drawing, no two boxes on top of each other, and no label on a box or another label. */
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
  const pills = pillBoxes(layout);
  for (const [index, pill] of pills.entries()) {
    expect(pill.x, pill.id).toBeGreaterThanOrEqual(0);
    expect(pill.y, pill.id).toBeGreaterThanOrEqual(0);
    expect(pill.x + pill.w, pill.id).toBeLessThanOrEqual(layout.width);
    expect(pill.y + pill.h, pill.id).toBeLessThanOrEqual(layout.height);
    for (const one of layout.boxes) expect(overlap(pill, one), `label ${pill.id} on box ${one.id}`).toBe(false);
    for (const other of pills.slice(index + 1)) expect(overlap(pill, other), `${pill.id} and ${other.id}`).toBe(false);
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

  it("keeps an edge's label (trimmed, none when empty) and tone", () => {
    const { edges } = cleanDiagram(
      [node('a'), node('b'), node('c')],
      [edge('a', 'b', { label: '  calls  ', tone: 'ACCENT' }), edge('b', 'c', { label: ' ' })],
    );
    expect(edges).toEqual([edge('a', 'b', { label: 'calls', tone: 'ACCENT' }), edge('b', 'c')]);
  });

  it("puts a label in a pill on its arrow, in the middle of the gap it crosses, with the arrow's tone", () => {
    const layout = layoutDiagram([node('a'), node('b')], [edge('a', 'b', { label: 'route.path', tone: 'WARN' })]);
    const [arrow] = layout.arrows;
    expect(arrow.tone).toBe('WARN');
    expect(arrow.label).toMatchObject({ text: 'route.path', title: null, h: 18 });
    const a = box(layout, 'a');
    const b = box(layout, 'b');
    expect(arrow.label!.x).toBeCloseTo((a.x + a.w + b.x) / 2, 0);
    expect(arrow.label!.y).toBeCloseTo(a.y + a.h / 2, 0);
    // The pill sits between the boxes, clear of both.
    expect(arrow.label!.x - arrow.label!.w / 2).toBeGreaterThan(a.x + a.w);
    expect(arrow.label!.x + arrow.label!.w / 2).toBeLessThan(b.x);
    expect(layoutDiagram([node('a'), node('b')], [edge('a', 'b')]).arrows[0].label).toBeNull();
  });

  it('sizes each gap between layers from its own labels, the room left shared, at the drawing width', () => {
    const layout = layoutDiagram(
      [node('a'), node('b'), node('c')],
      [edge('a', 'b'), edge('b', 'c', { label: 'a label of 28 characters ok' })],
    );
    const gap = (left: string, right: string) => box(layout, right).x - (box(layout, left).x + box(layout, left).w);
    const label = layout.arrows[1].label!;
    expect(layout.direction).toBe('across');
    expect(layout.width).toBe(DIAGRAM_WIDTH);
    expect(gap('b', 'c')).toBeGreaterThanOrEqual(label.w + 2 * 14);
    expect(gap('a', 'b')).toBeLessThan(gap('b', 'c'));
    expectTidy(layout);
  });

  it('keeps a labelled chain of 4 layers at the drawing width, or lays it top to bottom', () => {
    const named = [...'abcd'].map((id) => node(id, { label: `box ${id} with a long name` }));
    const chain = (label: string) => [edge('a', 'b'), edge('b', 'c', { label }), edge('c', 'd')];
    const long = layoutDiagram(named, chain('a label of thirty characters ok'));
    expect(long.direction).toBe('down');
    expect(long.width).toBe(DIAGRAM_WIDTH);
    expectTidy(long);

    const short = layoutDiagram(
      [...'abcd'].map((id) => node(id)),
      chain('calls'),
    );
    expect(short.direction).toBe('across');
    expect(short.width).toBe(DIAGRAM_WIDTH);
    expectTidy(short);
  });

  it('cuts a label too long for any pill, keeping the whole text for its title', () => {
    const long = 'a label of forty characters, at the cap';
    const layout = layoutDiagram([node('a'), node('b')], [edge('a', 'b', { label: long })]);
    const label = layout.arrows[0].label!;
    expect(label.text.endsWith('…')).toBe(true);
    expect(label.title).toBe(long);
    expect(label.w).toBeLessThanOrEqual(196);
    expectTidy(layout);
  });

  it('puts the label of an arrow that skips a layer in the gap before its target, never on the skipped box', () => {
    const layout = layoutDiagram(
      [node('request'), node('middleware', { label: 'auth middleware' }), node('handler')],
      [
        edge('request', 'middleware'),
        edge('middleware', 'handler'),
        edge('request', 'handler', { label: 'skips auth' }),
      ],
    );
    expect(layout.direction).toBe('across');
    const label = layout.arrows[2].label!;
    const middleware = box(layout, 'middleware');
    expect(label.x - label.w / 2).toBeGreaterThan(middleware.x + middleware.w);
    expect(label.x + label.w / 2).toBeLessThan(box(layout, 'handler').x);
    expectTidy(layout);
  });

  it('stacks the labels of arrows that share a gap, across and top to bottom, so no two overlap', () => {
    // Two labelled arrows leaving one box: a before-and-after side, three layers at 360px, goes top to bottom.
    const nodes = [
      node('a', { label: 'router' }),
      node('b', { label: 'cache' }),
      node('c', { label: 'builder' }),
      node('d'),
    ];
    const edges = [
      edge('a', 'b', { label: 'cache.get(key)' }),
      edge('a', 'c', { label: 'build(key) on a miss' }),
      edge('b', 'd'),
    ];
    const down = layoutDiagram(nodes, edges, { width: 360, maxColumns: 2 });
    expect(down.direction).toBe('down');
    expectTidy(down);
    const [first, second] = down.arrows.map(({ label }) => label!);
    expect(Math.abs(first.y - second.y)).toBeGreaterThanOrEqual(18);

    // Across, two labelled arrows into one target from boxes stacked close together.
    const across = layoutDiagram(
      [node('a'), node('b'), node('c')],
      [edge('a', 'c', { label: 'first call' }), edge('b', 'c', { label: 'second call' })],
    );
    expect(across.direction).toBe('across');
    expectTidy(across);
  });

  it("keeps the arrows in the edges' order, one per edge, so each is keyed by its index", () => {
    const edges = [edge('b', 'c', { label: 'second' }), edge('a', 'b', { label: 'first' }), edge('a', 'c')];
    const layout = layoutDiagram([node('a'), node('b'), node('c')], edges);
    expect(layout.arrows.map(({ from, to, label }) => [from, to, label?.text ?? null])).toEqual([
      ['b', 'c', 'second'],
      ['a', 'b', 'first'],
      ['a', 'c', null],
    ]);
  });

  it('keeps a label on a loop inside the drawing', () => {
    const layout = layoutDiagram(
      [node('a'), node('b'), node('c')],
      [edge('a', 'b'), edge('b', 'c'), edge('c', 'a', { label: 'retries' })],
    );
    const label = layout.arrows[2].label!;
    expect(layout.arrows[2].back).toBe(true);
    expect(label.y + label.h / 2).toBeLessThanOrEqual(layout.height);
    expect(label.y).toBeGreaterThan(Math.max(...layout.boxes.map(({ y, h }) => y + h)));
  });

  it('draws narrower when asked, going down past the layers that fit across', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('a', 'b'), edge('b', 'c')];
    expect(layoutDiagram(nodes, edges).direction).toBe('across');
    const narrow = layoutDiagram(nodes, edges, { width: 360, maxColumns: 2 });
    expect(narrow.direction).toBe('down');
    expect(narrow.width).toBe(360);
    expectTidy(narrow);
    expect(layoutDiagram(nodes.slice(0, 2), edges.slice(0, 1), { width: 360, maxColumns: 2 }).direction).toBe('across');
  });
});
