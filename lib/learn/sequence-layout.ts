import { clamp, clip, DIAGRAM_WIDTH, edgeOf, LABEL_CHAR, round, SUB_CHAR } from './diagram-layout';
import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from './learn.types';

/**
 * A call sequence, laid out here: the lesson sends actors (nodes, left to right in its order) and calls (edges, top to
 * bottom in its order), never coordinates. Each actor gets an equal column with a dashed lifeline under it; each call
 * is a row: its number in a circle on the caller's lifeline, an arrow to the callee's, its label above the arrow. A
 * reply is a dashed arrow back. Unlike a flow diagram, the same two actors may meet in several calls.
 */

export const SEQUENCE_MAX_ACTORS = 4;
export const SEQUENCE_MAX_CALLS = 8;

const PAD_X = 10;
const PAD_Y = 16;
const ACTOR_H = 44;
const ACTOR_H_SUB = 48;
const ACTOR_MIN_W = 72;
const ACTOR_PAD_X = 12;
/** Between two actors' boxes. */
const ACTOR_GAP = 16;
/** From the actors' boxes to the first call, then from one call to the next. */
const FIRST_CALL = 36;
const CALL_GAP = 44;
/** The lifelines run on under the last call. */
const TAIL = 20;
/** The number's circle, and how far a call's arrow stops short of the lifeline it reaches. */
export const NUMBER_R = 9;
const ARROW_GAP = 3;
/** A label's baseline above its arrow (clear of the number's circle), and its text width at 12px: mono for a call's code, Inter for a reply. */
const LABEL_LIFT = 12;
const CALL_CHAR = { mono: 7.2, sans: 6.6 } as const;

export type SequenceActor = {
  id: string;
  label: string;
  sub: string | null;
  /** The label and sub-line as sent, when cut to fit. */
  title: string | null;
  tone: LessonDiagramTone;
  mono: boolean;
  /** The lifeline's x, the middle of the actor's column. */
  x: number;
  box: { x: number; y: number; w: number; h: number };
};

export type SequenceCall = {
  /** 1, 2, … in the order the lesson sent the calls. */
  number: number;
  from: string;
  to: string;
  reply: boolean;
  tone: LessonDiagramTone;
  /** The circle's centre, on the caller's lifeline. */
  numberAt: { x: number; y: number };
  /** The arrow, from the circle to the callee's lifeline. */
  d: string;
  /** Its label above the arrow, cut to fit; `title` is the text as sent when cut. Mono for a call, not for a reply. */
  label: { text: string; title: string | null; x: number; y: number; mono: boolean } | null;
};

export type SequenceLayout = {
  width: number;
  height: number;
  actors: SequenceActor[];
  /** Where the lifelines start and end. */
  lifeline: { top: number; bottom: number };
  calls: SequenceCall[];
};

/**
 * The actors once each (the first of an id), at most 4, and the calls between two of them, at most 8, in the order
 * sent. A pair may repeat; a call from an actor to itself is left out.
 */
export function cleanSequence(
  nodes: readonly LessonDiagramNode[] | null | undefined,
  edges: readonly LessonDiagramEdge[] | null | undefined,
): { actors: LessonDiagramNode[]; calls: LessonDiagramEdge[] } {
  const kept = new Map<string, LessonDiagramNode>();
  for (const node of nodes ?? []) {
    if (!node?.id || kept.has(node.id) || kept.size >= SEQUENCE_MAX_ACTORS) continue;
    kept.set(node.id, node);
  }
  const calls = (edges ?? [])
    .filter((edge) => edge && edge.from !== edge.to && kept.has(edge.from) && kept.has(edge.to))
    .slice(0, SEQUENCE_MAX_CALLS)
    .map(edgeOf);
  return { actors: [...kept.values()], calls };
}

/** Lays out a call sequence: each actor's column and box, and each call's row, number, arrow and label. */
export function layoutSequence(
  nodes: readonly LessonDiagramNode[] | null | undefined,
  edges: readonly LessonDiagramEdge[] | null | undefined,
): SequenceLayout {
  const { actors: cleanActors, calls: cleanCalls } = cleanSequence(nodes, edges);
  const width = DIAGRAM_WIDTH;
  if (!cleanActors.length) return { width, height: 0, actors: [], lifeline: { top: 0, bottom: 0 }, calls: [] };

  const column = (width - 2 * PAD_X) / cleanActors.length;
  const room = column - ACTOR_GAP - 2 * ACTOR_PAD_X;
  const boxH = cleanActors.some((node) => node.sub) ? ACTOR_H_SUB : ACTOR_H;
  const actors = cleanActors.map((node, index): SequenceActor => {
    const char = node.mono ? LABEL_CHAR.mono : LABEL_CHAR.sans;
    const label = clip(node.label, Math.floor(room / char));
    const sub = node.sub ? clip(node.sub, Math.floor(room / SUB_CHAR)) : null;
    const text = Math.max(label.length * char, (sub?.length ?? 0) * SUB_CHAR);
    const w = Math.round(clamp(text + 2 * ACTOR_PAD_X, ACTOR_MIN_W, column - ACTOR_GAP));
    const x = round(PAD_X + column * (index + 0.5));
    const cut = label !== node.label || (sub ?? null) !== (node.sub ?? null);
    return {
      id: node.id,
      label,
      sub,
      title: cut ? [node.label, node.sub].filter(Boolean).join(' · ') : null,
      tone: node.tone,
      mono: node.mono,
      x,
      box: { x: round(x - w / 2), y: PAD_Y, w, h: boxH },
    };
  });

  const at = new Map(actors.map((actor) => [actor.id, actor.x]));
  const top = PAD_Y + boxH;
  const calls = cleanCalls.map((edge, index): SequenceCall => {
    const from = at.get(edge.from)!;
    const to = at.get(edge.to)!;
    const y = top + FIRST_CALL + index * CALL_GAP;
    const way = Math.sign(to - from);
    let label: SequenceCall['label'] = null;
    if (edge.label) {
      const mono = !edge.reply;
      const char = mono ? CALL_CHAR.mono : CALL_CHAR.sans;
      // Over the span between the two lifelines, or two columns when that is wider: a label may cross a lifeline.
      const span = Math.max(Math.abs(to - from) - 2 * (NUMBER_R + 6), 2 * column - 24);
      const text = clip(edge.label, Math.floor(span / char));
      const half = (text.length * char) / 2;
      label = {
        text,
        title: text === edge.label ? null : edge.label,
        x: round(clamp((from + to) / 2, PAD_X + half, width - PAD_X - half)),
        y: y - LABEL_LIFT,
        mono,
      };
    }
    return {
      number: index + 1,
      from: edge.from,
      to: edge.to,
      reply: edge.reply,
      tone: edge.tone,
      numberAt: { x: from, y },
      d: `M${round(from + way * (NUMBER_R + 2))} ${y} L${round(to - way * ARROW_GAP)} ${y}`,
      label,
    };
  });

  const bottom = top + FIRST_CALL + Math.max(0, calls.length - 1) * CALL_GAP + TAIL;
  return { width, height: Math.ceil(bottom + PAD_Y), actors, lifeline: { top, bottom }, calls };
}
