import type { ReactNode } from 'react';
import satori from 'satori';

import {
  buildStarHistoryChart,
  STAR_HISTORY_HEIGHT,
  STAR_HISTORY_PLOT,
  STAR_HISTORY_WIDTH,
  type StarPoint,
} from './star-history-chart';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';

// One palette for light and dark READMEs; the background stays transparent.
export const STAR_HISTORY_LINE = '#2f81f7';
export const STAR_HISTORY_TEXT = '#8b949e';

const PNG_WIDTH = 2000;

export type StarHistoryBadgeFormat = 'svg' | 'png';

export type StarHistoryBadgeInput =
  | { kind: 'chart'; nameWithOwner: string; points: StarPoint[]; current: StarPoint; gainedThisMonth?: number | null }
  | { kind: 'preparing'; nameWithOwner: string; stars: number; gainedThisMonth?: number | null };

const formatCount = (value: number) => value.toLocaleString('en-US');

const formatMonthly = (gained: number | null | undefined) =>
  gained === null || gained === undefined ? null : `${gained >= 0 ? '+' : ''}${formatCount(gained)} this month`;

function Frame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '16px 24px',
        color: STAR_HISTORY_TEXT,
        fontFamily: 'Inter',
      }}
    >
      {children}
    </div>
  );
}

function Header({ title, count, monthly }: Readonly<{ title: string; count: number; monthly: string | null }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div
        style={{
          display: 'block',
          flexShrink: 1,
          minWidth: 0,
          marginTop: 10,
          fontSize: 32,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: 32 }}>
        <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{formatCount(count)}</div>
        {monthly ? <div style={{ display: 'flex', fontSize: 24 }}>{monthly}</div> : null}
      </div>
    </div>
  );
}

function Mark() {
  return <div style={{ position: 'absolute', right: 24, bottom: 6, display: 'flex', fontSize: 18 }}>gitranks.com</div>;
}

async function renderSvg(node: ReactNode) {
  return satori(
    node,
    await getSatoriConfig({
      fontOptions: [{ weight: 400 }, { weight: 600 }, { weight: 700 }],
      width: STAR_HISTORY_WIDTH,
      height: STAR_HISTORY_HEIGHT,
    }),
  );
}

/** Puts raw SVG right after the root's opening tag, so satori's text is drawn over it. */
function underlay(svg: string, shapes: string) {
  const open = /^<svg[^>]*>/.exec(svg)?.[0];
  if (!open) {
    throw new Error('The star history SVG does not start with an <svg> root');
  }
  return `${open}${shapes}${svg.slice(open.length)}`;
}

async function renderChart(input: Extract<StarHistoryBadgeInput, { kind: 'chart' }>) {
  const { line, area, end, ticks } = buildStarHistoryChart(input.points, input.current);
  const { bottom } = STAR_HISTORY_PLOT;

  const svg = await renderSvg(
    <Frame>
      <Header title={input.nameWithOwner} count={input.current.stars} monthly={formatMonthly(input.gainedThisMonth)} />
      {ticks.map(({ x, label }) => (
        <div
          key={label}
          style={{
            position: 'absolute',
            top: bottom + 10,
            left: x - 40,
            width: 80,
            display: 'flex',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          {label}
        </div>
      ))}
      <Mark />
    </Frame>,
  );

  // satori lays out text only; the chart is drawn as plain SVG paths from numbers alone.
  const tickMarks = ticks.map(({ x }) => `M${x} ${bottom}v8`).join(' ');
  return underlay(
    svg,
    `<path d="${area}" fill="${STAR_HISTORY_LINE}" fill-opacity="0.2"/>` +
      `<path d="${line}" fill="none" stroke="${STAR_HISTORY_LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<circle cx="${end.x}" cy="${end.y}" r="5" fill="${STAR_HISTORY_LINE}"/>` +
      (tickMarks ? `<path d="${tickMarks}" stroke="${STAR_HISTORY_TEXT}" stroke-width="2"/>` : ''),
  );
}

function renderPreparing(input: Extract<StarHistoryBadgeInput, { kind: 'preparing' }>) {
  return renderSvg(
    <Frame>
      <Header title={input.nameWithOwner} count={input.stars} monthly={formatMonthly(input.gainedThisMonth)} />
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
        Star history on gitranks.com
      </div>
    </Frame>,
  );
}

/** The image a repository without data gets; kept as a static file, so serving it renders nothing. */
export function renderNotTrackedSvg() {
  return renderSvg(
    <Frame>
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
        Not tracked by gitranks
      </div>
      <Mark />
    </Frame>,
  );
}

export function renderStarHistorySvg(input: StarHistoryBadgeInput): Promise<string> {
  return input.kind === 'chart' ? renderChart(input) : renderPreparing(input);
}

export async function svgToPng(svg: string): Promise<Uint8Array<ArrayBuffer>> {
  // Lazy-load the native binding only for PNG so SVG responses stay independent of resvg.
  const { Resvg } = await import('@resvg/resvg-js');
  // satori draws text as paths; scanning the system fonts would only cost time.
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: PNG_WIDTH }, font: { loadSystemFonts: false } });
  return new Uint8Array(resvg.render().asPng());
}
