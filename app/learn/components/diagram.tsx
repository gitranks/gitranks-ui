import { type DiagramBox, layoutDiagram } from '@/lib/learn/diagram-layout';
import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from '@/lib/learn/learn.types';

/** Each tone's box and text, in the design system's colours. */
const TONES: Record<LessonDiagramTone, { fill: string; stroke: string; text: string }> = {
  PLAIN: { fill: 'var(--card)', stroke: 'var(--border)', text: 'var(--foreground)' },
  ACCENT: { fill: 'var(--brand-soft)', stroke: 'var(--primary)', text: 'var(--brand-soft-foreground)' },
  WARN: { fill: 'var(--warning-soft)', stroke: 'var(--warning)', text: 'var(--warning-soft-foreground)' },
};

const MONO = 'JetBrains Mono, monospace';
const SANS = 'Inter, sans-serif';

function Box({ box }: { box: DiagramBox }) {
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

/**
 * A lesson's diagram: boxes and arrows laid out here from its nodes and edges (the lesson sends no coordinates), in the
 * design system's colours. Scales down to its box. `id` keeps its arrow head apart from other diagrams on the page.
 */
export function Diagram({
  id,
  nodes,
  edges,
  label,
}: {
  id: string;
  nodes: readonly LessonDiagramNode[] | null | undefined;
  edges: readonly LessonDiagramEdge[] | null | undefined;
  /** What the drawing shows, for a screen reader: its caption. */
  label: string;
}) {
  const layout = layoutDiagram(nodes, edges);
  if (!layout.boxes.length) return null;
  const marker = `arrow-${id.replace(/[^\w-]/g, '_')}`;
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
        <marker
          id={marker}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path
            d="M1 1 9 5 1 9"
            fill="none"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      {layout.arrows.map((arrow) => (
        <path
          key={`${arrow.from}-${arrow.to}`}
          d={arrow.d}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          markerEnd={`url(#${marker})`}
          data-edge={`${arrow.from}>${arrow.to}`}
        />
      ))}
      {layout.boxes.map((box) => (
        <Box key={box.id} box={box} />
      ))}
    </svg>
  );
}
