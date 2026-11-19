import { type DiagramArrow, type DiagramBox, type DiagramOptions, layoutDiagram } from '@/lib/learn/diagram-layout';
import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from '@/lib/learn/learn.types';

/** Each tone's box and text, in the design system's colours. */
const TONES: Record<LessonDiagramTone, { fill: string; stroke: string; text: string }> = {
  PLAIN: { fill: 'var(--card)', stroke: 'var(--border)', text: 'var(--foreground)' },
  ACCENT: { fill: 'var(--brand-soft)', stroke: 'var(--primary)', text: 'var(--brand-soft-foreground)' },
  WARN: { fill: 'var(--warning-soft)', stroke: 'var(--warning)', text: 'var(--warning-soft-foreground)' },
};

/** Each tone's arrow (and its head): plain arrows in the muted text colour, the fix's in the brand's, broken in warning. */
export const ARROW_TONES: Record<LessonDiagramTone, string> = {
  PLAIN: 'var(--muted-foreground)',
  ACCENT: 'var(--primary)',
  WARN: 'var(--warning)',
};

export const MONO = 'JetBrains Mono, monospace';
export const SANS = 'Inter, sans-serif';

/** An arrow head in a tone's colour, for `markerEnd`: one per tone a drawing uses. */
export function ArrowHead({ id, tone }: { id: string; tone: LessonDiagramTone }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
      <path
        d="M1 1 9 5 1 9"
        fill="none"
        stroke={ARROW_TONES[tone] ?? ARROW_TONES.PLAIN}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </marker>
  );
}

/** The arrow head's id for a tone: the plain one keeps the drawing's own id. */
export const arrowHeadId = (marker: string, tone: LessonDiagramTone) =>
  tone === 'PLAIN' ? marker : `${marker}-${tone.toLowerCase()}`;

export function Box({ box }: { box: DiagramBox }) {
  const tone = TONES[box.tone] ?? TONES.PLAIN;
  const cx = box.x + box.w / 2;
  return (
    <g data-node={box.id}>
      {box.title ? <title>{box.title}</title> : null}
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={8} fill={tone.fill} stroke={tone.stroke} />
      <text
        x={cx}
        y={box.y + (box.sub ? 21 : 26.5)}
        textAnchor="middle"
        fontFamily={box.mono ? MONO : SANS}
        fontSize={box.mono ? 12.5 : 13}
        fontWeight={600}
        fill={tone.text}
      >
        {box.label}
      </text>
      {box.sub ? (
        <text
          x={cx}
          y={box.y + 39}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={11.5}
          fill={tone.text}
          opacity={0.8}
        >
          {box.sub}
        </text>
      ) : null}
    </g>
  );
}

/** An arrow's label, in a pill in the card's colour on the arrow's midpoint. */
function ArrowLabel({ label }: { label: NonNullable<DiagramArrow['label']> }) {
  return (
    <g data-arrow-label="">
      {label.title ? <title>{label.title}</title> : null}
      <rect
        x={label.x - label.w / 2}
        y={label.y - label.h / 2}
        width={label.w}
        height={label.h}
        rx={label.h / 2}
        fill="var(--card)"
        stroke="var(--border)"
      />
      <text x={label.x} y={label.y + 4} textAnchor="middle" fontFamily={SANS} fontSize={11.5} fill="var(--foreground)">
        {label.text}
      </text>
    </g>
  );
}

/**
 * A lesson's diagram: boxes and arrows laid out here from its nodes and edges (the lesson sends no coordinates), in the
 * design system's colours. Scales down to its box. `id` keeps its arrow head apart from other diagrams on the page.
 */
export function Diagram({
  id,
  nodes,
  edges,
  label,
  options,
}: {
  id: string;
  nodes: readonly LessonDiagramNode[] | null | undefined;
  edges: readonly LessonDiagramEdge[] | null | undefined;
  /** What the drawing shows, for a screen reader: its caption. */
  label: string;
  /** A narrower drawing, as a before-and-after's side is. */
  options?: DiagramOptions;
}) {
  const layout = layoutDiagram(nodes, edges, options);
  if (!layout.boxes.length) return null;
  const marker = `arrow-${id.replace(/[^\w-]/g, '_')}`;
  const tones = [...new Set<LessonDiagramTone>(['PLAIN', ...layout.arrows.map((arrow) => arrow.tone)])];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={label}
      data-diagram={layout.direction}
      style={{ width: '100%', maxWidth: layout.width, height: 'auto', display: 'block' }}
    >
      <defs>
        {tones.map((tone) => (
          <ArrowHead key={tone} id={arrowHeadId(marker, tone)} tone={tone} />
        ))}
      </defs>
      {layout.arrows.map((arrow, index) => (
        // Arrows never move: the index is the arrow.
        <path
          key={index}
          d={arrow.d}
          fill="none"
          stroke={ARROW_TONES[arrow.tone] ?? ARROW_TONES.PLAIN}
          strokeWidth={arrow.tone === 'PLAIN' ? 1.5 : 2}
          markerEnd={`url(#${arrowHeadId(marker, arrow.tone)})`}
          data-edge={`${arrow.from}>${arrow.to}`}
          data-tone={arrow.tone === 'PLAIN' ? undefined : arrow.tone}
        />
      ))}
      {layout.boxes.map((box) => (
        <Box key={box.id} box={box} />
      ))}
      {layout.arrows.map((arrow, index) =>
        // Labels go over the boxes' edges, never under them.
        arrow.label ? <ArrowLabel key={index} label={arrow.label} /> : null,
      )}
    </svg>
  );
}
