import { describe, expect, it } from 'vitest';

import { blockOfVisual } from './learn-visual';

const diagram = {
  type: 'diagram',
  caption: 'A request and its reply',
  layout: 'sequence',
  nodes: [
    { id: 'a', label: 'Client', tone: 'plain' },
    { id: 'b', label: 'Server', tone: 'accent', mono: true, sub: 'port 80' },
  ],
  edges: [
    { from: 'a', to: 'b', label: 'GET /' },
    { from: 'b', to: 'a', label: '200', reply: true, tone: 'warn' },
  ],
};

describe('blockOfVisual', () => {
  it('draws a table, its ring kept only when it names a row', () => {
    const table = {
      type: 'table',
      caption: 'Growth',
      columns: ['Items', 'Pairs'],
      rows: [
        ['10', '45'],
        ['100', '4,950'],
      ],
      ring: 1,
    };
    expect(blockOfVisual(table)).toMatchObject({ type: 'TABLE', caption: 'Growth', rows: table.rows, ring: 1 });
    expect(blockOfVisual({ ...table, ring: 5 })?.ring).toBeNull();
    expect(blockOfVisual({ ...table, ring: -1 })?.ring).toBeNull();
  });

  it('draws a diagram with today’s tones and layout', () => {
    const block = blockOfVisual(diagram);
    expect(block).toMatchObject({ type: 'DIAGRAM', layout: 'SEQUENCE', caption: 'A request and its reply' });
    expect(block?.nodes).toEqual([
      { id: 'a', label: 'Client', sub: null, tone: 'PLAIN', mono: false },
      { id: 'b', label: 'Server', sub: 'port 80', tone: 'ACCENT', mono: true },
    ]);
    expect(block?.edges?.[1]).toEqual({ from: 'b', to: 'a', label: '200', reply: true, tone: 'WARN' });
    expect(blockOfVisual({ ...diagram, layout: undefined })?.layout).toBe('FLOW');
  });

  it('draws a before-and-after of two diagrams', () => {
    const side = { nodes: diagram.nodes, edges: diagram.edges.slice(0, 1) };
    expect(
      blockOfVisual({ type: 'compare', of: 'diagram', caption: 'Before and after', before: side, after: side }),
    ).toMatchObject({
      type: 'COMPARE',
      compareOf: 'DIAGRAM',
      before: { nodes: expect.any(Array), excerpt: null },
    });
  });

  it('draws nothing for an unknown kind or a broken shape', () => {
    expect(blockOfVisual({ type: 'chart' })).toBeNull();
    expect(blockOfVisual({ ...diagram, edges: [{ from: 'a', to: 'missing' }] })).toBeNull();
    expect(blockOfVisual({ ...diagram, nodes: [{ id: 'a', label: 'A', tone: 'loud' }] })).toBeNull();
    expect(blockOfVisual({ type: 'compare', of: 'code', before: {}, after: {} })).toBeNull();
    expect(blockOfVisual({ type: 'table', columns: ['A'], rows: [[1]] })).toBeNull();
    expect(blockOfVisual(null)).toBeNull();
  });
});
