export const STAR_HISTORY_WIDTH = 1000;
export const STAR_HISTORY_HEIGHT = 400;

/** The plot area inside the viewBox; the header sits above it, the year labels below. */
export const STAR_HISTORY_PLOT = { left: 24, right: 976, top: 136, bottom: 320 } as const;

/** Year labels closer than this (in viewBox units) are thinned out. */
const MIN_TICK_SPACING = 80;
/** Half a year label's width: a label is dropped when it would cross the image's edge. */
const TICK_HALF_WIDTH = 30;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export type StarPoint = { date: string | Date; stars: number };

export type StarHistoryChart = {
  /** The cumulative line, left to right. */
  line: string;
  /** The line closed down to the bottom of the plot. */
  area: string;
  /** Today's point, the end of the line. */
  end: { x: number; y: number };
  ticks: { x: number; label: string }[];
};

const round = (value: number) => Math.round(value * 10) / 10;

/** The series in time order, ending with `current`; points at or after it are dropped. */
function toSeries(points: StarPoint[], current: StarPoint) {
  const currentTime = new Date(current.date).getTime();
  const series = points
    .map((point) => ({ time: new Date(point.date).getTime(), stars: Math.max(0, point.stars) }))
    .filter(({ time }) => Number.isFinite(time) && time < currentTime)
    .sort((a, b) => a.time - b.time);

  series.push({ time: currentTime, stars: Math.max(0, current.stars) });
  return series;
}

function yearTicks(minTime: number, maxTime: number) {
  const { left, right } = STAR_HISTORY_PLOT;
  const span = maxTime - minTime;
  if (span <= 0) return [];

  const width = right - left;
  const step = Math.max(1, Math.ceil(MIN_TICK_SPACING / ((width * YEAR_MS) / span)));
  const ticks: StarHistoryChart['ticks'] = [];

  for (let year = new Date(minTime).getUTCFullYear() + 1; year <= new Date(maxTime).getUTCFullYear(); year++) {
    const x = round(left + ((Date.UTC(year, 0, 1) - minTime) / span) * width);
    if (year % step === 0 && x >= TICK_HALF_WIDTH && x <= STAR_HISTORY_WIDTH - TICK_HALF_WIDTH) {
      ticks.push({ x, label: String(year) });
    }
  }

  return ticks;
}

/** The chart of a cumulative star series, in viewBox units. */
export function buildStarHistoryChart(points: StarPoint[], current: StarPoint): StarHistoryChart {
  const { left, right, top, bottom } = STAR_HISTORY_PLOT;
  const series = toSeries(points, current);
  const minTime = series[0].time;
  const maxTime = series[series.length - 1].time;
  const maxStars = Math.max(...series.map(({ stars }) => stars));

  const xOf = (time: number) =>
    maxTime > minTime ? left + ((time - minTime) / (maxTime - minTime)) * (right - left) : right;
  const yOf = (stars: number) => (maxStars > 0 ? bottom - (stars / maxStars) * (bottom - top) : bottom);

  const coords = series.map(({ time, stars }) => ({ x: round(xOf(time)), y: round(yOf(stars)) }));
  // A single point has no width of its own: draw it flat across the plot.
  if (coords.length === 1) {
    coords.unshift({ x: left, y: coords[0].y });
  }

  const line = coords.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x} ${bottom} L${coords[0].x} ${bottom} Z`;

  return { line, area, end: coords[coords.length - 1], ticks: yearTicks(minTime, maxTime) };
}
