import type {
  LessonBlock,
  LessonCompareSide,
  LessonDiagramEdge,
  LessonDiagramNode,
  LessonDiagramTone,
} from './learn.types';

/**
 * A course's visual (a table, a diagram, a before-and-after of two diagrams), as the API gives it, turned into the
 * block today's views draw. The views are kept as they are: only the shape they read is made here. Anything not of the
 * shape gives null, so a page drawn before a new kind of visual ships skips it.
 */

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const TONES: Record<string, LessonDiagramTone> = { plain: 'PLAIN', accent: 'ACCENT', warn: 'WARN' };

const textOf = (value: unknown) => (typeof value === 'string' ? value : null);

const EMPTY: LessonBlock = {
  type: 'TEXT',
  text: null,
  nodes: null,
  edges: null,
  caption: null,
  layout: null,
  file: null,
  lines: null,
  mark: null,
  repo: null,
  commit: null,
  path: null,
  fromLine: null,
  toLine: null,
  excerpt: null,
  compareOf: null,
  before: null,
  after: null,
  columns: null,
  rows: null,
  ring: null,
};

function nodesOf(value: unknown): LessonDiagramNode[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const nodes: LessonDiagramNode[] = [];
  for (const item of value) {
    const node = recordOf(item);
    const tone = TONES[String(node?.tone)];
    if (!node || typeof node.id !== 'string' || typeof node.label !== 'string' || !tone) return null;
    nodes.push({ id: node.id, label: node.label, sub: textOf(node.sub), tone, mono: node.mono === true });
  }
  return nodes;
}

function edgesOf(value: unknown, nodes: LessonDiagramNode[]): LessonDiagramEdge[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set(nodes.map((node) => node.id));
  const edges: LessonDiagramEdge[] = [];
  for (const item of value) {
    const edge = recordOf(item);
    if (!edge || typeof edge.from !== 'string' || typeof edge.to !== 'string') return null;
    if (!ids.has(edge.from) || !ids.has(edge.to)) return null;
    edges.push({
      from: edge.from,
      to: edge.to,
      label: textOf(edge.label),
      reply: edge.reply === true,
      tone: TONES[String(edge.tone)] ?? 'PLAIN',
    });
  }
  return edges;
}

function sideOf(value: unknown): LessonCompareSide | null {
  const side = recordOf(value);
  const nodes = nodesOf(side?.nodes);
  const edges = nodes ? edgesOf(side?.edges, nodes) : null;
  if (!nodes || !edges) return null;
  return { nodes, edges, path: null, fromLine: null, toLine: null, excerpt: null };
}

/** The block a visual draws as, or null when it is not of a known kind and shape. */
export function blockOfVisual(value: unknown): LessonBlock | null {
  const visual = recordOf(value);
  if (!visual) return null;
  const caption = textOf(visual.caption);
  switch (visual.type) {
    case 'table': {
      const columns = visual.columns;
      const rows = visual.rows;
      if (!Array.isArray(columns) || !columns.length || !columns.every((cell) => typeof cell === 'string')) return null;
      if (!Array.isArray(rows) || !rows.length) return null;
      if (!rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) return null;
      const ring =
        Number.isInteger(visual.ring) && (visual.ring as number) < rows.length ? (visual.ring as number) : null;
      return {
        ...EMPTY,
        type: 'TABLE',
        caption,
        columns: columns as string[],
        rows: rows as string[][],
        ring,
      };
    }
    case 'diagram': {
      const nodes = nodesOf(visual.nodes);
      const edges = nodes ? edgesOf(visual.edges, nodes) : null;
      if (!nodes || !edges) return null;
      return {
        ...EMPTY,
        type: 'DIAGRAM',
        caption,
        nodes,
        edges,
        layout: visual.layout === 'sequence' ? 'SEQUENCE' : 'FLOW',
      };
    }
    case 'compare': {
      if (visual.of !== 'diagram') return null;
      const before = sideOf(visual.before);
      const after = sideOf(visual.after);
      if (!before || !after) return null;
      return { ...EMPTY, type: 'COMPARE', caption, compareOf: 'DIAGRAM', before, after };
    }
    default:
      return null;
  }
}
