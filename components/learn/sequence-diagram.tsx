import { ARROW_TONES, ArrowHead, arrowHeadId, Box, MONO, SANS } from './diagram';
import type { LessonDiagramEdge, LessonDiagramNode, LessonDiagramTone } from '@/lib/learn/learn.types';
import { layoutSequence, NUMBER_R, type SequenceCall } from '@/lib/learn/sequence-layout';

/** Below this width a sequence of four actors scrolls sideways in its own box, so its labels stay readable. */
const FOUR_ACTORS_MIN_W = 520;

/** A call's number in a circle on the caller's lifeline: filled in the brand's colour for the call the fix changed. */
function CallNumber({ call }: { call: SequenceCall }) {
  const accent = call.tone === 'ACCENT';
  const ring = ARROW_TONES[call.tone] ?? ARROW_TONES.PLAIN;
  return (
    <g>
      <circle
        cx={call.numberAt.x}
        cy={call.numberAt.y}
        r={NUMBER_R}
        fill={accent ? 'var(--primary)' : 'var(--card)'}
        stroke={call.tone === 'PLAIN' ? 'var(--border)' : ring}
      />
      <text
        x={call.numberAt.x}
        y={call.numberAt.y + 3.5}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={10.5}
        fontWeight={600}
        fill={accent ? 'var(--primary-foreground)' : 'var(--foreground)'}
      >
        {call.number}
      </text>
    </g>
  );
}

/**
 * A lesson's call sequence: actors left to right, each with a dashed lifeline, and the calls between them top to
 * bottom, numbered; a reply is dashed, the call the fix changed is in the brand's colour. Laid out here from the
 * diagram's nodes and edges, in the design system's colours, and scaled down to its box (four actors scroll sideways on
 * a phone). A screen reader reads the calls as an ordered list.
 */
export function SequenceDiagram({
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
  const layout = layoutSequence(nodes, edges);
  if (!layout.actors.length) return null;
  const marker = `arrow-${id.replace(/[^\w-]/g, '_')}`;
  const tones = [...new Set<LessonDiagramTone>(['PLAIN', ...layout.calls.map((call) => call.tone)])];
  const names = new Map((nodes ?? []).map((node) => [node.id, node.label]));
  const wide = layout.actors.length >= 4;
  return (
    <div className="overflow-x-auto" data-sequence={layout.actors.length}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={label}
        data-diagram="sequence"
        style={{
          width: '100%',
          minWidth: wide ? FOUR_ACTORS_MIN_W : undefined,
          maxWidth: layout.width,
          height: 'auto',
          display: 'block',
        }}
      >
        <defs>
          {tones.map((tone) => (
            <ArrowHead key={tone} id={arrowHeadId(marker, tone)} tone={tone} />
          ))}
        </defs>
        {layout.actors.map((actor) => (
          <line
            key={actor.id}
            x1={actor.x}
            y1={layout.lifeline.top}
            x2={actor.x}
            y2={layout.lifeline.bottom}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            data-lifeline={actor.id}
          />
        ))}
        {layout.actors.map((actor) => (
          <Box key={actor.id} box={{ ...actor, ...actor.box, layer: 0 }} />
        ))}
        {layout.calls.map((call) => {
          const colour = ARROW_TONES[call.tone] ?? ARROW_TONES.PLAIN;
          return (
            <g key={call.number} data-call={call.number} data-reply={call.reply || undefined}>
              <path
                d={call.d}
                fill="none"
                stroke={colour}
                strokeWidth={call.tone === 'PLAIN' ? 1.5 : 2}
                strokeDasharray={call.reply ? '5 4' : undefined}
                markerEnd={`url(#${arrowHeadId(marker, call.tone)})`}
              />
              <CallNumber call={call} />
              {call.label ? (
                <text
                  x={call.label.x}
                  y={call.label.y}
                  textAnchor="middle"
                  fontFamily={call.label.mono ? MONO : SANS}
                  fontSize={12}
                  fontWeight={call.tone === 'ACCENT' ? 600 : undefined}
                  fill={
                    call.tone === 'ACCENT'
                      ? 'var(--primary)'
                      : call.reply
                        ? 'var(--muted-foreground)'
                        : 'var(--foreground)'
                  }
                  // A halo in the card's colour keeps a label readable where it crosses a lifeline.
                  stroke="var(--card)"
                  strokeWidth={4}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {call.label.title ? <title>{call.label.title}</title> : null}
                  {call.label.text}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <ol className="sr-only">
        {layout.calls.map((call) => (
          <li key={call.number}>
            {names.get(call.from) ?? call.from} {call.reply ? 'answers' : 'calls'} {names.get(call.to) ?? call.to}
            {call.label ? `: ${call.label.title ?? call.label.text}` : ''}
            {call.tone === 'ACCENT' ? ' (what the fix changed)' : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}
