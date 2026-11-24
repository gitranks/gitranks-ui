import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from '@/lib/workspace/blocks/block.types';

/**
 * A lesson's diagram, laid out here: the lesson sends boxes and arrows (nodes and edges), never coordinates. Boxes go in
 * layers along the arrows (each box one layer after the furthest box that points to it), left to right, or top to
 * bottom when there are more layers than fit across. Inside a layer, boxes follow the boxes they come from, so arrows
 * cross as little as they can. An arrow that points back (a loop) runs around the outside.
 *
 * An arrow's label sits in a pill on the arrow, in the gap just before its target (so one that skips a layer never sits
 * on a skipped box), labels in one gap stacked apart. Each gap grows to fit its own labels; when labels would make the
 * drawing wider than its width, it goes top to bottom instead, where each gap between rows grows to stack its labels.
 * A loop's label sits outside the boxes, beside its curve.
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
/** An arrow's label: 11.5px Inter in a pill this high, at most this wide, clear of the boxes on each side. */
const PILL_H = 18;
const PILL_PAD_X = 7;
const PILL_MAX_W = 196;
const PILL_CLEAR = 14;
/** Between two labels stacked in one gap, and above and below them in a gap between rows. */
const PILL_STACK = 6;
const PILL_CLEAR_Y = 10;

/** Rough text widths at the diagram's sizes: label 12.5px mono or 13px Inter, the line under it 11.5px Inter. */
export const LABEL_CHAR = { mono: 7.6, sans: 7.2 } as const;
export const SUB_CHAR = 6.3;

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

/** An arrow's label: its text (cut to fit), the text as sent when cut, and its pill, centred on the arrow's midpoint. */
export type DiagramArrowLabel = { text: string; title: string | null; x: number; y: number; w: number; h: number };

export type DiagramArrow = {
  from: string;
  to: string;
  back: boolean;
  d: string;
  tone: LessonDiagramTone;
  label: DiagramArrowLabel | null;
};

/** Where a diagram is drawn: its width (a wider one scales down) and how many layers go left to right at most. */
export type DiagramOptions = { width?: number; maxColumns?: number };

export type DiagramLayout = {
  direction: 'across' | 'down';
  width: number;
  height: number;
  boxes: DiagramBox[];
  arrows: DiagramArrow[];
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const round = (value: number) => Math.round(value * 10) / 10;

/** The text cut to `chars` characters, with an ellipsis when it was longer. */
export const clip = (text: string, chars: number) =>
  text.length > chars ? `${text.slice(0, Math.max(1, chars - 1))}…` : text;

/** An edge as the layout reads it: its label trimmed (none when empty), PLAIN when it has no tone. */
export const edgeOf = (edge: LessonDiagramEdge): LessonDiagramEdge => ({
  from: edge.from,
  to: edge.to,
  label: edge.label?.trim() || null,
  reply: edge.reply === true,
  tone: edge.tone ?? 'PLAIN',
});

/**
 * The nodes once each (the first of an id), at most 8, and the edges that join two of them once each, at most 10, with
 * their labels and tones.
 */
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
    joined.push(edgeOf(edge));
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

/** An arrow label's text, cut to the widest pill, and its pill's size. */
function pillOf(label: string): Omit<DiagramArrowLabel, 'x' | 'y'> {
  const text = clip(label, Math.floor((PILL_MAX_W - 2 * PILL_PAD_X) / SUB_CHAR));
  return {
    text,
    title: text === label ? null : label,
    w: Math.round(text.length * SUB_CHAR + 2 * PILL_PAD_X),
    h: PILL_H,
  };
}

/** Lays out a diagram's nodes and edges: where each box goes, and each arrow's path and label. */
export function layoutDiagram(
  rawNodes: readonly LessonDiagramNode[] | null | undefined,
  rawEdges: readonly LessonDiagramEdge[] | null | undefined,
  { width: minWidth = DIAGRAM_WIDTH, maxColumns = MAX_COLUMNS }: DiagramOptions = {},
): DiagramLayout {
  const { nodes, edges } = cleanDiagram(rawNodes, rawEdges);
  if (!nodes.length) return { direction: 'across', width: minWidth, height: 0, boxes: [], arrows: [] };

  const ids = nodes.map((node) => node.id);
  const back = backEdgesOf(ids, edges);
  const forward = edges.filter((edge) => !back.has(edge));
  const layer = layersOf(ids, forward);
  const layers = orderOf(ids, layer, forward);
  const sized = new Map(nodes.map((node) => [node.id, { node, ...sizeOf(node) }]));
  const pills = edges.map((edge) => (edge.label ? pillOf(edge.label) : null));
  /** The gap a forward arrow's label sits in: the last one before its target. None for a loop. */
  const gapOf = (edge: LessonDiagramEdge) =>
    layer.get(edge.to)! > layer.get(edge.from)! ? layer.get(edge.to)! - 1 : null;
  const gapCount = Math.max(0, layers.length - 1);
  const labelsIn = Array.from({ length: gapCount }, (_, gap) =>
    edges.flatMap((edge, index) => (pills[index] && gapOf(edge) === gap ? [index] : [])),
  );

  // Across: each gap wide enough for its own labels and the arrow on each side of them.
  const columnW = layers.map((column) => Math.max(...column.map((id) => sized.get(id)!.w)));
  const used = columnW.reduce((sum, w) => sum + w, 0);
  const gapNeed = labelsIn.map((inGap) =>
    Math.max(LAYER_GAP, ...inGap.map((index) => pills[index]!.w + 2 * PILL_CLEAR + ARROW_GAP)),
  );
  const acrossW = used + gapNeed.reduce((sum, gap) => sum + gap, 0) + 2 * PAD_X;
  const labelled = labelsIn.some((inGap) => inGap.length > 0);
  // One layer (boxes with no arrows between them) is a row, as is a chain too long to go across, or one its labels would
  // make wider than the drawing.
  const direction =
    layers.length > 1 && layers.length <= maxColumns && !(labelled && acrossW > minWidth) ? 'across' : 'down';

  const boxes = new Map<string, DiagramBox>();
  const place = (id: string, x: number, y: number) => {
    const { node, label, sub, title, w, h } = sized.get(id)!;
    boxes.set(id, { id, label, sub, title, tone: node.tone, mono: node.mono, layer: layer.get(id) ?? 0, x, y, w, h });
  };

  let width: number;
  let height: number;
  /** Each gap's span along the layers: x from the end of one column to the start of the next, or y between rows. */
  const gapSpan: [number, number][] = [];
  if (direction === 'across') {
    const stackH = layers.map(
      (column) => column.reduce((sum, id) => sum + sized.get(id)!.h, 0) + (column.length - 1) * STACK_GAP,
    );
    // Room left over is shared by every gap.
    const spare = Math.max(0, minWidth - acrossW) / gapCount;
    width = Math.max(minWidth, acrossW);
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
      x += columnW[index];
      if (index < gapCount) {
        gapSpan.push([x, x + gapNeed[index] + spare]);
        x += gapNeed[index] + spare;
      }
    });
  } else {
    const rowH = layers.map((row) => Math.max(...row.map((id) => sized.get(id)!.h)));
    const rowW = layers.map((row) => row.reduce((sum, id) => sum + sized.get(id)!.w, 0) + (row.length - 1) * SIDE_GAP);
    // Each gap between rows tall enough to stack its labels.
    const rowGap = labelsIn.map((inGap) =>
      Math.max(ROW_GAP, inGap.length * (PILL_H + PILL_STACK) - PILL_STACK + 2 * PILL_CLEAR_Y),
    );
    width = Math.max(minWidth, Math.max(...rowW) + 2 * PAD_X);
    height = rowH.reduce((sum, h) => sum + h, 0) + rowGap.reduce((sum, gap) => sum + gap, 0) + 2 * PAD_Y;
    let y = PAD_Y;
    layers.forEach((row, index) => {
      let x = (width - rowW[index]) / 2;
      for (const id of row) {
        const { w, h } = sized.get(id)!;
        place(id, x, y + (rowH[index] - h) / 2);
        x += w + SIDE_GAP;
      }
      y += rowH[index];
      if (index < gapCount) {
        gapSpan.push([y, y + rowGap[index]]);
        y += rowGap[index];
      }
    });
  }

  /** An arrow's path: a line (its two ends kept, for where its label goes), or a curve with its midpoint. */
  const line = (sx: number, sy: number, ex: number, ey: number) => ({
    d: `M${round(sx)} ${round(sy)} L${round(ex)} ${round(ey)}`,
    ends: [sx, sy, ex, ey] as const,
    mid: [(sx + ex) / 2, (sy + ey) / 2] as const,
  });
  const curve = (sx: number, sy: number, ax: number, ay: number, bx: number, by: number, ex: number, ey: number) => ({
    d: `M${round(sx)} ${round(sy)} C${round(ax)} ${round(ay)} ${round(bx)} ${round(by)} ${round(ex)} ${round(ey)}`,
    ends: null,
    // A cubic curve's point at its middle.
    mid: [(sx + 3 * ax + 3 * bx + ex) / 8, (sy + 3 * ay + 3 * by + ey) / 8] as const,
  });

  const loops = edges.some((edge) => back.has(edge) || layer.get(edge.from) === layer.get(edge.to));
  const paths = edges.map((edge) => {
    const a = boxes.get(edge.from)!;
    const b = boxes.get(edge.to)!;
    const ahead = layer.get(edge.to)! > layer.get(edge.from)!;
    if (direction === 'across') {
      if (ahead) return { back: false, ...line(a.x + a.w, a.y + a.h / 2, b.x - ARROW_GAP, b.y + b.h / 2) };
      // Under the boxes, from one's bottom to the other's.
      const [sx, sy, ex, ey] = [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y + b.h + ARROW_GAP];
      const low = Math.max(sy, ey) + LOOP_SWING;
      return { back: true, ...curve(sx, sy, sx, low, ex, low, ex, ey) };
    }
    if (ahead) return { back: false, ...line(a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y - ARROW_GAP) };
    // Beside the boxes, from one's right side to the other's.
    const [sx, sy, ex, ey] = [a.x + a.w, a.y + a.h / 2, b.x + b.w + ARROW_GAP, b.y + b.h / 2];
    const side = Math.max(sx, ex) + LOOP_SWING;
    return { back: true, ...curve(sx, sy, side, sy, side, ey, ex, ey) };
  });

  // Room for the loops' swing outside the boxes.
  if (loops && direction === 'across') height += LOOP_SWING;
  if (loops && direction === 'down') {
    const right = Math.max(...[...boxes.values()].map((box) => box.x + box.w));
    width = Math.max(width, right + LOOP_SWING + PAD_X);
  }

  // Where each label sits: [x, y], its pill's centre.
  const at: ([number, number] | null)[] = edges.map(() => null);
  labelsIn.forEach((inGap, gap) => {
    const [from, to] = gapSpan[gap];
    // The point on an arrow at a place along the layers: x across, y down.
    const on = (index: number, along: number) => {
      const [sx, sy, ex, ey] = paths[index].ends!;
      if (direction === 'across') return ex === sx ? sy : sy + ((ey - sy) * (along - sx)) / (ex - sx);
      return ey === sy ? sx : sx + ((ex - sx) * (along - sy)) / (ey - sy);
    };
    const middle = (from + to) / 2;
    const order = [...inGap].sort((a, b) => on(a, middle) - on(b, middle));
    if (direction === 'across') {
      // At the gap's middle on each arrow, pushed apart down the gap where two would touch, then kept inside.
      let below = -Infinity;
      const ys = order.map((index) => {
        below = Math.max(on(index, middle), below + PILL_H + PILL_STACK);
        return below;
      });
      const over = Math.max(0, ys.at(-1)! + PILL_H / 2 + 1 - height);
      order.forEach((index, n) => {
        at[index] = [middle, ys[n] - over];
      });
    } else {
      // Stacked down the gap between rows, each on its own arrow.
      const top = middle - (order.length * (PILL_H + PILL_STACK) - PILL_STACK) / 2;
      order.forEach((index, n) => {
        const y = top + n * (PILL_H + PILL_STACK) + PILL_H / 2;
        at[index] = [on(index, y), y];
      });
    }
  });
  // A loop's label sits beside its curve, outside every box: under them across, to their right down.
  const lowest = Math.max(...[...boxes.values()].map((box) => box.y + box.h));
  const rightmost = Math.max(...[...boxes.values()].map((box) => box.x + box.w));
  pills.forEach((pill, index) => {
    if (!pill || at[index]) return;
    const [mx, my] = paths[index].mid;
    if (direction === 'across') {
      const y = Math.max(my, lowest + PILL_STACK + pill.h / 2);
      height = Math.max(height, y + pill.h / 2 + PILL_STACK);
      at[index] = [mx, y];
    } else {
      const x = Math.max(mx, rightmost + PILL_STACK + pill.w / 2);
      width = Math.max(width, x + pill.w / 2 + PAD_X);
      at[index] = [x, my];
    }
  });

  // Arrows keep the edges' order: the index is the arrow. A label stays inside the drawing.
  const arrows = edges.map((edge, index): DiagramArrow => {
    const { back: isBack, d } = paths[index];
    const pill = pills[index];
    const [x, y] = at[index] ?? [0, 0];
    return {
      from: edge.from,
      to: edge.to,
      back: isBack,
      d,
      tone: edge.tone,
      label: pill
        ? {
            ...pill,
            x: round(clamp(x, pill.w / 2 + 1, width - pill.w / 2 - 1)),
            y: round(clamp(y, pill.h / 2 + 1, height - pill.h / 2 - 1)),
          }
        : null,
    };
  });

  return {
    direction,
    width: Math.ceil(width),
    height: Math.ceil(height),
    boxes: ids.map((id) => boxes.get(id)!),
    arrows,
  };
}
