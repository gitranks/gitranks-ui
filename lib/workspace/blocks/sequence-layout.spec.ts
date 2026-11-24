import { describe, expect, it } from 'vitest';

import { DIAGRAM_WIDTH } from './diagram-layout';
import { cleanSequence, layoutSequence, SEQUENCE_MAX_ACTORS, SEQUENCE_MAX_CALLS } from './sequence-layout';
import type { LessonDiagramEdge, LessonDiagramNode } from '@/lib/workspace/blocks/block.types';

const node = (id: string, extra: Partial<LessonDiagramNode> = {}): LessonDiagramNode => ({
  id,
  label: id,
  sub: null,
  tone: 'PLAIN',
  mono: false,
  ...extra,
});
const call = (from: string, to: string, label: string, extra: Partial<LessonDiagramEdge> = {}): LessonDiagramEdge => ({
  from,
  to,
  label,
  reply: false,
  tone: 'PLAIN',
  ...extra,
});

const actors = [
  node('router', { label: 'Router' }),
  node('resolve', { label: 'resolveLayouts', mono: true }),
  node('cache'),
];
const calls = [
  call('router', 'resolve', 'resolveLayouts(route)'),
  call('resolve', 'cache', 'cache.get(route.path)', { tone: 'ACCENT' }),
  call('cache', 'resolve', 'undefined', { reply: true }),
  call('resolve', 'cache', 'cache.set(key, layouts)'),
];

describe('a call sequence', () => {
  it('keeps each actor once, at most 4, and the calls between two of them in order, a pair again too, at most 8', () => {
    const { actors: kept, calls: callsKept } = cleanSequence(
      [...actors, node('router', { label: 'again' }), node('d'), node('e')],
      [...calls, call('router', 'router', 'self'), call('router', 'gone', 'x'), ...calls, ...calls],
    );
    expect(kept.map(({ id }) => id)).toEqual(['router', 'resolve', 'cache', 'd']);
    expect(kept).toHaveLength(SEQUENCE_MAX_ACTORS);
    expect(kept[0].label).toBe('Router');
    expect(callsKept).toHaveLength(SEQUENCE_MAX_CALLS);
    expect(callsKept.slice(0, 5).map(({ from, to }) => `${from}>${to}`)).toEqual([
      'router>resolve',
      'resolve>cache',
      'cache>resolve',
      'resolve>cache',
      'router>resolve',
    ]);
  });

  it('draws nothing without actors', () => {
    expect(layoutSequence([], calls)).toMatchObject({ actors: [], calls: [], height: 0 });
    expect(layoutSequence(null, null).actors).toEqual([]);
  });

  it('puts the actors in equal columns across the width, in the order sent, each box on its lifeline', () => {
    const layout = layoutSequence(actors, calls);
    expect(layout.width).toBe(DIAGRAM_WIDTH);
    const xs = layout.actors.map(({ x }) => x);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 1);
    expect(xs[0]).toBeLessThan(xs[1]);
    for (const actor of layout.actors) {
      expect(actor.box.x + actor.box.w / 2).toBeCloseTo(actor.x, 0);
      expect(actor.box.x).toBeGreaterThanOrEqual(0);
      expect(actor.box.x + actor.box.w).toBeLessThanOrEqual(layout.width);
    }
    expect(layout.lifeline.top).toBe(layout.actors[0].box.y + layout.actors[0].box.h);
    expect(layout.lifeline.bottom).toBeLessThanOrEqual(layout.height);
  });

  it("draws one row per call, top to bottom, numbered, from the caller's lifeline to the callee's", () => {
    const layout = layoutSequence(actors, calls);
    expect(layout.calls.map(({ number }) => number)).toEqual([1, 2, 3, 4]);
    const ys = layout.calls.map(({ numberAt }) => numberAt.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(new Set(ys).size).toBe(4);
    expect(Math.max(...ys)).toBeLessThan(layout.lifeline.bottom);
    expect(Math.min(...ys)).toBeGreaterThan(layout.lifeline.top);
    const x = new Map(layout.actors.map((actor) => [actor.id, actor.x]));
    // Call 1 runs right, from the router; the reply runs left, from the cache.
    expect(layout.calls[0].numberAt.x).toBe(x.get('router'));
    const [, start, end] = /^M([\d.]+) [\d.]+ L([\d.]+) /.exec(layout.calls[0].d) ?? [];
    expect(Number(start)).toBeGreaterThan(x.get('router')!);
    expect(Number(end)).toBeLessThan(x.get('resolve')!);
    expect(layout.calls[2].numberAt.x).toBe(x.get('cache'));
    const back = /^M([\d.]+) [\d.]+ L([\d.]+) /.exec(layout.calls[2].d)!;
    expect(Number(back[1])).toBeGreaterThan(Number(back[2]));
  });

  it('labels each call above its arrow: a call in mono, a reply in the text font; keeps reply and tone', () => {
    const layout = layoutSequence(actors, calls);
    const [first, accent, reply] = layout.calls;
    expect(first.label).toMatchObject({ text: 'resolveLayouts(route)', mono: true, title: null });
    expect(first.label!.y).toBeLessThan(first.numberAt.y);
    expect(accent.tone).toBe('ACCENT');
    expect(reply).toMatchObject({ reply: true, label: { text: 'undefined', mono: false } });
  });

  it('cuts a label too long for its room, keeping the whole text, and keeps every label inside the drawing', () => {
    const four = [node('a'), node('b'), node('c'), node('d')];
    const long = 'x'.repeat(70);
    const layout = layoutSequence(four, [call('a', 'b', long), call('d', 'c', 'a short one')]);
    const label = layout.calls[0].label!;
    expect(label.text.endsWith('…')).toBe(true);
    expect(label.title).toBe(long);
    for (const { label: one } of layout.calls) {
      const half = (one!.text.length * 7.2) / 2;
      expect(one!.x - half).toBeGreaterThanOrEqual(0);
      expect(one!.x + half).toBeLessThanOrEqual(layout.width);
    }
  });

  it('grows with the calls, and lays out a call with no label', () => {
    const one = layoutSequence(actors, calls.slice(0, 1));
    const four = layoutSequence(actors, calls);
    expect(four.height).toBeGreaterThan(one.height);
    expect(layoutSequence(actors, [{ ...calls[0], label: null }]).calls[0].label).toBeNull();
  });
});
