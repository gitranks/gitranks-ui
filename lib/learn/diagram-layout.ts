import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from './learn.types';

/**
 * A lesson's diagram, laid out here: the lesson sends boxes and arrows (nodes and edges), never coordinates. Boxes go in
 * layers along the arrows (each box one layer after the furthest box that points to it), left to right, or top to
 * bottom when there are more layers than fit across. Inside a layer, boxes follow the boxes they come from, so arrows
 * cross as little as they can. An arrow that points back (a loop) runs around the outside.
 */

export const DIAGRAM_MAX_NODES = 8;
export const DIAGRAM_MAX_EDGES = 10;

/** The width the diagram is drawn at; a wider one scales down to its box. */
export const DIAGRAM_WIDTH = 680;
/** At most this many layers go left to right; more go top to bottom. */
const MAX_COLUMNS = 4;

const PAD_X = 10;
const PAD_Y = 16;
const BOX_H = 44;
const BOX_H_SUB = 48;
const BOX_MIN_W = 88;
const BOX_MAX_W = 220;
const BOX_PAD_X = 14;
/** Between layers, and between boxes inside one. */
const LAYER_GAP = 56;
const STACK_GAP = 32;
const ROW_GAP = 48;
const SIDE_GAP = 24;
/** How far a loop's arrow swings out of the diagram. */
const LOOP_SWING = 36;
/** Arrows stop short of a box, so the head is seen. */
const ARROW_GAP = 4;

/** Rough text widths at the diagram's sizes: label 12.5px mono or 13px Inter, the line under it 11.5px Inter. */
const LABEL_CHAR = { mono: 7.6, sans: 7.2 } as const;
const SUB_CHAR = 6.3;

export type DiagramBox = {
  id: string;
  label: string;
  sub: string | null;
  /** The label and sub-line as sent, when cut to fit. */
  title: string | null;
  tone: LessonDiagramTone;
  mono: boolean;
  layer: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DiagramArrow = { from: string; to: string; back: boolean; d: string };

export type DiagramLayout = {
  direction: 'across' | 'down';
  width: number;
  height: number;
  boxes: DiagramBox[];
  arrows: DiagramArrow[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

/** The text cut to `chars` characters, with an ellipsis when it was longer. */
const clip = (text: string, chars: number) =>
  text.length > chars ? `${text.slice(0, Math.max(1, chars - 1))}…` : text;

/** The nodes once each (the first of an id), at most 8, and the edges that join two of them once each, at most 10. */
export function cleanDiagram(
  nodes: readonly LessonDiagramNode[] | null | undefined,
  edges: readonly LessonDiagramEdge[] | null | undefined,
): { nodes: LessonDiagramNode[]; edges: LessonDiagramEdge[] } {
  const kept = new Map<string, LessonDiagramNode>();
  for (const node of nodes ?? []) {
    if (!node?.id || kept.has(node.id) || kept.size >= DIAGRAM_MAX_NODES) continue;
    kept.set(node.id, node);
  }
  const seen = new Set<string>();
  const joined: LessonDiagramEdge[] = [];
  for (const edge of edges ?? []) {
    if (!edge || edge.from === edge.to || !kept.has(edge.from) || !kept.has(edge.to)) continue;
    const key = `${edge.from}\u0000${edge.to}`;
    if (seen.has(key) || joined.length >= DIAGRAM_MAX_EDGES) continue;
    seen.add(key);
    joined.push({ from: edge.from, to: edge.to });
  }
  return { nodes: [...kept.values()], edges: joined };
}

/** The edges that close a loop, found walking the nodes in their order: the rest point forward. */
function backEdgesOf(ids: string[], edges: LessonDiagramEdge[]): Set<LessonDiagramEdge> {
  const out = new Map(ids.map((id) => [id, edges.filter((edge) => edge.from === id)]));
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<LessonDiagramEdge>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const edge of out.get(id) ?? []) {
      const next = state.get(edge.to);
      if (next === 'open') back.add(edge);
      else if (!next) visit(edge.to);
    }
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  return back;
}

/** Each node's layer: one after the furthest node that points to it, along the forward edges. */
function layersOf(ids: string[], forward: LessonDiagramEdge[]): Map<string, number> {
  const layer = new Map(ids.map((id) => [id, 0]));
  // Forward edges form no loop, so this settles within as many rounds as there are nodes.
  for (let round = 0; round < ids.length; round++) {
    let moved = false;
    for (const { from, to } of forward) {
      const next = (layer.get(from) ?? 0) + 1;
      if (next > (layer.get(to) ?? 0)) {
        layer.set(to, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return layer;
}

/** The layers' order: each box after the boxes it comes from (down), then before the boxes it leads to (up). */
function orderOf(ids: string[], layer: Map<string, number>, forward: LessonDiagramEdge[]): string[][] {
  const count = Math.max(0, ...layer.values()) + 1;
  const layers: string[][] = Array.from({ length: count }, () => []);
  for (const id of ids) layers[layer.get(id) ?? 0].push(id);

  const sweep = (index: number, neighbours: (id: string) => string[], against: string[]) => {
    const position = new Map(against.map((id, at) => [id, at]));
    const current = layers[index];
    const centre = new Map(
      current.map((id, at) => {
        const near = neighbours(id).filter((other) => position.has(other));
        // A box with nothing on that side keeps its place, scaled to the other layer's length.
        const own = current.length > 1 ? (at * (against.length - 1)) / (current.length - 1) : (against.length - 1) / 2;
        return [id, near.length ? near.reduce((sum, other) => sum + (position.get(other) ?? 0), 0) / near.length : own];
      }),
    );
    layers[index] = [...current].sort((a, b) => (centre.get(a) ?? 0) - (centre.get(b) ?? 0));
  };
  const into = (id: string) => forward.filter((edge) => edge.to === id).map((edge) => edge.from);
  const outOf = (id: string) => forward.filter((edge) => edge.from === id).map((edge) => edge.to);
  for (let index = 1; index < count; index++) sweep(index, into, layers[index - 1]);
  for (let index = count - 2; index >= 0; index--) sweep(index, outOf, layers[index + 1]);
  return layers;
}

/** A box's size and its text, cut to the widest box. */
function sizeOf(node: LessonDiagramNode): Pick<DiagramBox, 'label' | 'sub' | 'title' | 'w' | 'h'> {
  const char = node.mono ? LABEL_CHAR.mono : LABEL_CHAR.sans;
  const room = BOX_MAX_W - 2 * BOX_PAD_X;
  const label = clip(node.label, Math.floor(room / char));
  const sub = node.sub ? clip(node.sub, Math.floor(room / SUB_CHAR)) : null;
  const text = Math.max(label.length * char, (sub?.length ?? 0) * SUB_CHAR);
  const cut = label !== node.label || (sub ?? null) !== (node.sub ?? null);
  return {
    label,
    sub,
    title: cut ? [node.label, node.sub].filter(Boolean).join(' · ') : null,
    w: Math.round(clamp(text + 2 * BOX_PAD_X, BOX_MIN_W, BOX_MAX_W)),
    h: sub ? BOX_H_SUB : BOX_H,
  };
}

/** Lays out a diagram's nodes and edges: where each box goes, and each arrow's path. */
export function layoutDiagram(
  rawNodes: readonly LessonDiagramNode[] | null | undefined,
  rawEdges: readonly LessonDiagramEdge[] | null | undefined,
): DiagramLayout {
  const { nodes, edges } = cleanDiagram(rawNodes, rawEdges);
  if (!nodes.length) return { direction: 'across', width: DIAGRAM_WIDTH, height: 0, boxes: [], arrows: [] };

  const ids = nodes.map((node) => node.id);
  const back = backEdgesOf(ids, edges);
  const forward = edges.filter((edge) => !back.has(edge));
  const layer = layersOf(ids, forward);
  const layers = orderOf(ids, layer, forward);
  // One layer (boxes with no arrows between them) is a row, as is a chain too long to go across.
  const direction = layers.length > 1 && layers.length <= MAX_COLUMNS ? 'across' : 'down';

  const sized = new Map(nodes.map((node) => [node.id, { node, ...sizeOf(node) }]));
  const boxes = new Map<string, DiagramBox>();
  const place = (id: string, x: number, y: number) => {
    const { node, label, sub, title, w, h } = sized.get(id)!;
    boxes.set(id, { id, label, sub, title, tone: node.tone, mono: node.mono, layer: layer.get(id) ?? 0, x, y, w, h });
  };

  let width: number;
  let height: number;
  if (direction === 'across') {
    const columnW = layers.map((column) => Math.max(...column.map((id) => sized.get(id)!.w)));
    const stackH = layers.map(
      (column) => column.reduce((sum, id) => sum + sized.get(id)!.h, 0) + (column.length - 1) * STACK_GAP,
    );
    const used = columnW.reduce((sum, w) => sum + w, 0);
    const gap = Math.max(LAYER_GAP, (DIAGRAM_WIDTH - 2 * PAD_X - used) / (layers.length - 1));
    width = Math.max(DIAGRAM_WIDTH, used + gap * (layers.length - 1) + 2 * PAD_X);
    const tallest = Math.max(...stackH);
    height = tallest + 2 * PAD_Y;
    let x = PAD_X;
    layers.forEach((column, index) => {
      let y = PAD_Y + (tallest - stackH[index]) / 2;
      for (const id of column) {
        const { w, h } = sized.get(id)!;
        place(id, x + (columnW[index] - w) / 2, y);
        y += h + STACK_GAP;
      }
      x += columnW[index] + gap;
    });
  } else {
    const rowH = layers.map((row) => Math.max(...row.map((id) => sized.get(id)!.h)));
    const rowW = layers.map((row) => row.reduce((sum, id) => sum + sized.get(id)!.w, 0) + (row.length - 1) * SIDE_GAP);
    width = Math.max(DIAGRAM_WIDTH, Math.max(...rowW) + 2 * PAD_X);
    height = rowH.reduce((sum, h) => sum + h, 0) + (layers.length - 1) * ROW_GAP + 2 * PAD_Y;
    let y = PAD_Y;
    layers.forEach((row, index) => {
      let x = (width - rowW[index]) / 2;
      for (const id of row) {
        const { w, h } = sized.get(id)!;
        place(id, x, y + (rowH[index] - h) / 2);
        x += w + SIDE_GAP;
      }
      y += rowH[index] + ROW_GAP;
    });
  }

  const loops = edges.some((edge) => back.has(edge) || layer.get(edge.from) === layer.get(edge.to));
  const arrows = edges.map((edge): DiagramArrow => {
    const a = boxes.get(edge.from)!;
    const b = boxes.get(edge.to)!;
    const ahead = layer.get(edge.to)! > layer.get(edge.from)!;
    if (direction === 'across') {
      if (ahead) {
        const [sx, sy, ex, ey] = [a.x + a.w, a.y + a.h / 2, b.x - ARROW_GAP, b.y + b.h / 2];
        return { ...edge, back: false, d: `M${round(sx)} ${round(sy)} L${round(ex)} ${round(ey)}` };
      }
      // Under the boxes, from one's bottom to the other's.
      const [sx, sy, ex, ey] = [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y + b.h + ARROW_GAP];
      const low = Math.max(sy, ey) + LOOP_SWING;
      return {
        ...edge,
        back: true,
        d: `M${round(sx)} ${round(sy)} C${round(sx)} ${round(low)} ${round(ex)} ${round(low)} ${round(ex)} ${round(ey)}`,
      };
    }
    if (ahead) {
      const [sx, sy, ex, ey] = [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y - ARROW_GAP];
      return { ...edge, back: false, d: `M${round(sx)} ${round(sy)} L${round(ex)} ${round(ey)}` };
    }
    // Beside the boxes, from one's right side to the other's.
    const [sx, sy, ex, ey] = [a.x + a.w, a.y + a.h / 2, b.x + b.w + ARROW_GAP, b.y + b.h / 2];
    const side = Math.max(sx, ex) + LOOP_SWING;
    return {
      ...edge,
      back: true,
      d: `M${round(sx)} ${round(sy)} C${round(side)} ${round(sy)} ${round(side)} ${round(ey)} ${round(ex)} ${round(ey)}`,
    };
  });

  // Room for the loops' swing outside the boxes.
  if (loops && direction === 'across') height += LOOP_SWING;
  if (loops && direction === 'down') {
    const right = Math.max(...[...boxes.values()].map((box) => box.x + box.w));
    width = Math.max(width, right + LOOP_SWING + PAD_X);
  }

  return {
    direction,
    width: Math.ceil(width),
    height: Math.ceil(height),
    boxes: ids.map((id) => boxes.get(id)!),
    arrows,
  };
}
