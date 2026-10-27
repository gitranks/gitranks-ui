import type { ReactElement } from 'react';

import { fetchAvatar, fetchAvatars } from './avatars';
import { Avatar, axisTicks, CardFrame, Line, Num, Words } from './card-frame';
import {
  COUNT_CHART_MIN_POINTS,
  countSeries,
  isUserRankedIn,
  rankPropOf,
  USER_WALL_OFFERED,
  userLanguageOf,
  userRanksIn,
} from './catalogue';
import { contributorCount } from './contributors';
import { type ContributorsWall, type OrgFacts, type RepoFacts, type UserFacts, wallOf } from './facts';
import { formatCompact, formatFull, topShare } from './format';
import { TierGlyph } from './glyphs';
import { goalText } from './goals';
import { monthKeysOf, monthLabelOf } from './month';
import type { BadgeParams } from './params';
import { bestCompletedMonth } from './race';
import { type CardPalette, tierColor, toneColor } from './schemes';
import type { By } from './types';
import { WALL_AVATAR, WALL_COLUMNS, WALL_GAP, WALL_WIDTH, wallLayout } from './wall-layout';
import { REPO_TIER_NAMES, TIER_NAMES } from '@/app/app.consts';

/** A card or chart, drawn once per palette. */
export type Drawing = { width: number; height: number; draw: (palette: CardPalette) => ReactElement };

const dot = ' · ';

/** "Legends", "Elites"; "Skilled" stays as it is. */
const tierPlural = (tier: number, count: number) => {
  const name = TIER_NAMES[tier - 1];
  return count === 1 || name === 'Skilled' ? name : `${name}s`;
};

function Bar({ share, palette, height = 5 }: Readonly<{ share: number; palette: CardPalette; height?: number }>) {
  const width = `${Math.round(Math.min(1, Math.max(0.03, share)) * 100)}%`;
  return (
    <div style={{ display: 'flex', height, borderRadius: height, backgroundColor: palette.track, overflow: 'hidden' }}>
      <div style={{ display: 'flex', width, height, backgroundColor: palette.accent }} />
    </div>
  );
}

function Stat({
  value,
  label,
  palette,
  size = 17,
}: Readonly<{ value: string; label: string; palette: CardPalette; size?: number }>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, color: palette.muted }}>
      <Num size={size} color={palette.text}>
        {value}
      </Num>
      <div style={{ display: 'flex' }}>{label}</div>
    </div>
  );
}

// Repositories

function repoRankCard(repo: RepoFacts, params: BadgeParams): Drawing | null {
  const rank = repo.rank;
  if (!rank?.s) return null;
  const top = topShare(rank.s, repo.totals.repos);
  const goal = repo.rankGoal;
  return {
    width: 400,
    height: 120,
    draw: (palette) => (
      <CardFrame palette={palette} logo={params.logo} title="rank" name={repo.nameWithOwner} width={400} height={120}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
          <Num size={22}>#{formatFull(rank.s ?? 0)}</Num>
          <Line color={palette.muted} style={{ marginLeft: 10 }}>
            {repo.totals.repos ? <Words>{`of ${formatCompact(repo.totals.repos)}`}</Words> : null}
            {top ? <Words>{`${repo.totals.repos ? dot : ''}${top}`}</Words> : null}
            {rank.l && rank.language ? (
              <>
                <Words>{`${dot}${rank.language} rank `}</Words>
                <Num color={palette.text}>#{formatFull(rank.l)}</Num>
              </>
            ) : null}
          </Line>
        </div>
        {goal ? (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            <Bar share={repo.stars / (repo.stars + goal.needed)} palette={palette} />
            <Line color={palette.muted} style={{ marginTop: 7 }}>
              <Num color={palette.accent}>{formatFull(goal.needed)}</Num>
              <Words>{` ${goal.needed === 1 ? 'star' : 'stars'} to the ${goalText(goal, 'repo')}`}</Words>
            </Line>
          </div>
        ) : (
          <Line color={palette.muted} style={{ marginTop: 10 }}>
            <Words>{`${formatFull(repo.stars)} stars`}</Words>
          </Line>
        )}
      </CardFrame>
    ),
  };
}

/** Month starts of the last 12 months and today, as one cumulative series. */
function lastYearSeries(repo: RepoFacts): number[] {
  if (!repo.history) return [];
  const points = [...repo.history.points]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-12)
    .map(({ stars }) => stars);
  return [...points, repo.history.current.stars];
}

/** A line and its area over a box, as path data. */
function sparkPaths(series: number[], width: number, height: number, inset = 2) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const coords = series.map((value, index) => {
    const x = Math.round(index * step * 10) / 10;
    const y = Math.round((inset + (1 - (value - min) / span) * (height - 2 * inset)) * 10) / 10;
    return `${x} ${y}`;
  });
  if (coords.length === 1) coords.unshift(`0 ${coords[0].split(' ')[1]}`);
  const line = `M${coords.join(' L')}`;
  return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
}

function repoStarsCard(repo: RepoFacts, params: BadgeParams, now: Date): Drawing | null {
  if (!repo.history) return null;
  const series = lastYearSeries(repo);
  // The record is the best completed month, as the month shield's record state reads it.
  const best = bestCompletedMonth(repo.history, monthKeysOf(now).thisKey);
  const gain = repo.gainedThisMonth ?? 0;
  const { line, area } = sparkPaths(series, 366, 34);
  return {
    width: 400,
    height: 120,
    draw: (palette) => (
      <CardFrame palette={palette} logo={params.logo} title="stars" name={repo.nameWithOwner} width={400} height={120}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
          <Num size={22}>{`${formatFull(repo.history?.current.stars ?? repo.stars)} ★`}</Num>
          <Line color={palette.muted} style={{ marginLeft: 10 }}>
            {gain > 0 ? (
              <>
                <Num color={toneColor('positive', palette.ground, palette.text)}>+{formatFull(gain)}</Num>
                <Words> this month</Words>
              </>
            ) : null}
            {best ? (
              <>
                <Words>{gain > 0 ? `${dot}record ` : 'record month '}</Words>
                <Num color={palette.text}>+{formatFull(best)}</Num>
              </>
            ) : null}
          </Line>
        </div>
        <svg width={366} height={34} viewBox="0 0 366 34" style={{ marginTop: 8 }} aria-hidden="true">
          <path d={area} fill={palette.accent} fillOpacity="0.1" />
          <path d={line} fill="none" stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </CardFrame>
    ),
  };
}

async function repoStarredByCard(repo: RepoFacts, params: BadgeParams): Promise<Drawing | null> {
  const best = repo.starsBest;
  if (!best || best.total < 1) return null;
  const people = best.top.slice(0, 6);
  const avatars = await fetchAvatars(people.map(({ avatarUrl }) => avatarUrl));
  const counts = best.counts
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.tier - a.tier)
    .slice(0, 2);
  return {
    width: 400,
    height: 140,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="starred by top developers"
        name={repo.nameWithOwner}
        width={400}
        height={140}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
          <Num size={22}>{formatFull(best.total)}</Num>
          <div style={{ display: 'flex', marginLeft: 14 }}>
            {people.map((person, index) => (
              <div key={index} style={{ display: 'flex', marginLeft: index ? -4 : 0 }}>
                <Avatar src={avatars[index]} size={26} palette={palette} tier={person.tier} border={2} />
              </div>
            ))}
          </div>
        </div>
        <Line color={palette.muted} style={{ marginTop: 10, alignItems: 'center' }}>
          {counts.map(({ tier, count }) => (
            <div
              key={tier}
              style={{ display: 'flex', alignItems: 'center', marginRight: 8, color: tierColor(tier, palette.ground) }}
            >
              <TierGlyph icon={{ kind: 'user-tier', tier }} size={12} color={tierColor(tier, palette.ground)} />
              <Num size={11}>{` ${formatFull(count)}`}</Num>
              <Words>{` ${tierPlural(tier, count)}`}</Words>
            </div>
          ))}
          <Words>developers whose own repos have 1,000+ stars</Words>
        </Line>
      </CardFrame>
    ),
  };
}

function repoCommunityCard(repo: RepoFacts, params: BadgeParams): Drawing | null {
  const pulse = repo.pulse;
  if (!pulse) return null;
  const countries = contributorCount(repo, 'countries');
  const sibling = repo.siblings?.[0];
  return {
    width: 400,
    height: 140,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="community"
        name={repo.nameWithOwner}
        width={400}
        height={140}
      >
        <div style={{ display: 'flex', marginTop: 12 }}>
          <Stat value={formatFull(pulse.active12)} label="active in 12 mo" palette={palette} />
          {countries !== null ? <Stat value={formatFull(countries)} label="countries" palette={palette} /> : null}
          <Stat value={`+${formatFull(pulse.new12)}`} label="new in 12 mo" palette={palette} />
        </div>
        {sibling ? (
          <Line color={palette.muted} style={{ marginTop: 12 }}>
            <Words>built alongside </Words>
            <Words color={palette.text}>{sibling.nameWithOwner}</Words>
          </Line>
        ) : null}
      </CardFrame>
    ),
  };
}

function repoTierCard(repo: RepoFacts, params: BadgeParams): Drawing | null {
  const tier = repo.rank?.s ? repo.rank.tier : null;
  if (!tier) return null;
  const levels = repo.tierLevels[tier.tier] ?? 5;
  return {
    width: 400,
    height: 120,
    draw: (palette) => {
      const color = tierColor(tier.tier, palette.ground);
      return (
        <CardFrame palette={palette} logo={params.logo} title="tier" name={repo.nameWithOwner} width={400} height={120}>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
            <TierGlyph icon={{ kind: 'repo-tier', tier: tier.tier }} size={44} color={color} large />
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 12 }}>
              <div style={{ display: 'flex', fontSize: 19, fontWeight: 600, color }}>
                {REPO_TIER_NAMES[tier.tier - 1]}
              </div>
              <div style={{ display: 'flex', color: palette.muted }}>{`level ${tier.level} of ${levels}`}</div>
            </div>
          </div>
        </CardFrame>
      );
    },
  };
}

// Charts

type BarPoint = { label: string; value: number };

const CHART_BOTTOM = 22;

/** The y axis of a chart: round ticks from 0 to above `max`, and the y of a value in a plot `height` tall. */
function yAxis(max: number, height: number) {
  const ticks = axisTicks(Math.max(max, 1));
  const top = ticks[ticks.length - 1];
  const plotHeight = height - CHART_BOTTOM;
  const y = (value: number) => Math.round(((1 - value / top) * (plotHeight - 4) + 4) * 10) / 10;
  return { ticks, y, plotHeight };
}

type AxisLabel = { key: string; left: number; width: number; label: string; align: 'flex-start' | 'center' };

/**
 * A chart's frame: gridlines with their values on the left, labels under the plot, and the plot's own shapes drawn
 * over the gridlines.
 */
function Plot({
  width,
  height,
  axis,
  max,
  palette,
  labels,
  shapes,
}: Readonly<{
  width: number;
  height: number;
  axis: number;
  max: number;
  palette: CardPalette;
  labels: AxisLabel[];
  shapes: (y: (value: number) => number, plotHeight: number) => ReactElement;
}>) {
  const { ticks, y, plotHeight } = yAxis(max, height);
  return (
    <div style={{ display: 'flex', position: 'relative', width, height, marginTop: 10 }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
        aria-hidden="true"
      >
        {ticks.map((tick) => (
          <path key={tick} d={`M${axis} ${y(tick)} H${width}`} stroke={palette.track} strokeWidth="1" />
        ))}
        {shapes(y, plotHeight)}
      </svg>
      {ticks.map((tick) => (
        <div
          key={tick}
          style={{
            position: 'absolute',
            left: 0,
            top: y(tick) - 8,
            width: axis - 8,
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: 11,
            color: palette.muted,
          }}
        >
          {formatCompact(tick)}
        </div>
      ))}
      {labels.map(({ key, left, width: labelWidth, label, align }) => (
        <div
          key={key}
          style={{
            position: 'absolute',
            left,
            top: plotHeight + 6,
            width: labelWidth,
            display: 'flex',
            justifyContent: align,
            fontSize: 12,
            color: palette.muted,
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

/** Bars over a y axis with gridlines; the last bar is the latest month. */
function BarsChart({
  points,
  palette,
  width,
  height,
}: Readonly<{ points: BarPoint[]; palette: CardPalette; width: number; height: number }>) {
  const axis = 44;
  const slot = (width - axis) / points.length;
  const bar = slot * 0.7;
  return (
    <Plot
      width={width}
      height={height}
      axis={axis}
      max={Math.max(...points.map(({ value }) => value))}
      palette={palette}
      labels={points.map(({ label }, index) => ({
        key: String(index),
        left: axis + index * slot,
        width: slot,
        label,
        align: 'center',
      }))}
      shapes={(y, plotHeight) => (
        <>
          {points.map(({ value }, index) => {
            const h = Math.max(0, plotHeight - y(value));
            return (
              <rect
                key={index}
                x={axis + index * slot + (slot - bar) / 2}
                y={plotHeight - h}
                width={bar}
                height={h}
                rx="3"
                fill={palette.accent}
              />
            );
          })}
        </>
      )}
    />
  );
}

function contributorsChart(entity: RepoFacts | OrgFacts, params: BadgeParams): Drawing | null {
  const series = entity.pulseSeries;
  if (!entity.pulse || !series?.months.length) return null;
  const from = Math.max(0, series.months.length - 12);
  const points = series.months.slice(from).map((month, offset) => ({
    label: monthLabelOf(month).slice(0, 3),
    value: (series.activeLinked[from + offset] ?? 0) + (series.activeAnonymous[from + offset] ?? 0),
  }));
  const latest = points[points.length - 1];
  const name = entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
  return {
    width: 800,
    height: 300,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="active contributors per month"
        name={name}
        width={800}
        height={300}
        scale={1.5}
      >
        <Line color={palette.muted} size={15} style={{ marginTop: 10 }}>
          <Num size={24} color={palette.text}>
            {formatFull(latest.value)}
          </Num>
          <Words>{` in ${latest.label}${dot}${formatFull(entity.pulse?.active12 ?? 0)} in 12 months`}</Words>
        </Line>
        <BarsChart points={points} palette={palette} width={752} height={182} />
      </CardFrame>
    ),
  };
}

const COUNT_TITLE: Record<By, string> = {
  stars: 'stars on own repos',
  contributions: 'contribution stars',
  followers: 'followers',
};

const countUnit = (by: By) => (by === 'followers' ? ' followers' : ' ★');

function userCountChart(user: UserFacts, params: BadgeParams, now: Date): Drawing | null {
  const prop = rankPropOf(params.by);
  const snapshots = countSeries(user, params.by).slice(-24);
  if (snapshots.length < COUNT_CHART_MIN_POINTS) return null;
  const current = user[prop] ?? snapshots[snapshots.length - 1][1];
  const thisStart = user.snapshots?.[monthKeysOf(now).thisKey]?.[prop];
  const gain = typeof thisStart === 'number' ? current - thisStart : null;
  const values = [...snapshots.map(([, value]) => value), current];
  const keys = snapshots.map(([key]) => key);

  const width = 752;
  const height = 182;
  const axis = 52;
  const plotWidth = width - axis - 6;
  const x = (index: number) => Math.round((axis + (index / (values.length - 1)) * plotWidth) * 10) / 10;
  const labelEvery = Math.max(1, Math.ceil(keys.length / 5));
  const labels: AxisLabel[] = keys
    .map((key, index) => ({ key, index }))
    .filter(({ index }) => index % labelEvery === 0)
    .map(({ key, index }) => ({
      key,
      left: Math.min(x(index) - 40, width - 80),
      width: 80,
      label: monthLabelOf(key),
      align: index === 0 ? 'flex-start' : 'center',
    }));

  return {
    width: 800,
    height: 300,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title={`${COUNT_TITLE[params.by]} · last ${keys.length} months`}
        name={user.login}
        width={800}
        height={300}
        scale={1.5}
      >
        <Line color={palette.muted} size={15} style={{ marginTop: 10 }}>
          <Num size={24} color={palette.text}>{`${formatCompact(current)}${countUnit(params.by)}`}</Num>
          {gain !== null && gain > 0 ? (
            <Num size={15} color={toneColor('positive', palette.ground, palette.text)}>
              {`  +${formatCompact(gain)} this month`}
            </Num>
          ) : null}
        </Line>
        <Plot
          width={width}
          height={height}
          axis={axis}
          max={Math.max(...values)}
          palette={palette}
          labels={labels}
          shapes={(y, plotHeight) => {
            const line = `M${values.map((value, index) => `${x(index)} ${y(value)}`).join(' L')}`;
            const area = `${line} L${x(values.length - 1)} ${plotHeight} L${x(0)} ${plotHeight} Z`;
            return (
              <>
                <path d={area} fill={palette.accent} fillOpacity="0.1" />
                <path
                  d={line}
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={x(values.length - 1)} cy={y(current)} r="4" fill={palette.accent} />
              </>
            );
          }}
        />
      </CardFrame>
    ),
  };
}

// Developers

async function userProfileCard(user: UserFacts, params: BadgeParams): Promise<Drawing | null> {
  const by: By | null = isUserRankedIn(user, 'stars', 'global')
    ? 'stars'
    : isUserRankedIn(user, 'contributions', 'global')
      ? 'contributions'
      : null;
  if (!by) return null;
  const prop = rankPropOf(by);
  const rank = user.rankGlobal?.[prop] ?? user.rankGlobal?.[`${prop}Provisional`] ?? 0;
  const total = user.tiersGlobal?.users[prop] ?? null;
  const top = topShare(rank, total);
  const avatar = await fetchAvatar(user.avatarUrl);

  const stats: { value: string; label: string }[] = [];
  if (by === 'stars' && isUserRankedIn(user, 'contributions', 'global')) {
    const contributions = user.rankGlobal?.c ?? user.rankGlobal?.cProvisional;
    if (contributions) stats.push({ value: `#${formatFull(contributions)}`, label: 'contributions' });
  }
  if (user.country && isUserRankedIn(user, by, 'country')) {
    const country = userRanksIn(user, 'country')?.[prop];
    if (country) stats.push({ value: `#${formatFull(country)}`, label: user.country });
  }
  const language = userLanguageOf(user, null);
  if (language?.rank) stats.push({ value: `#${formatFull(language.rank)}`, label: language.name });

  return {
    width: 400,
    height: 140,
    draw: (palette) => (
      <CardFrame palette={palette} logo={params.logo} name={user.login} width={400} height={140}>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
          <Avatar src={avatar} size={40} palette={palette} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 12 }}>
            <Num size={22}>#{formatFull(rank)}</Num>
            <div style={{ display: 'flex', color: palette.muted }}>
              {[`by ${by}`, top && total ? `${top} of ${formatCompact(total)}` : null].filter(Boolean).join(dot)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 10 }}>
          {stats.map(({ value, label }) => (
            <Stat key={label} value={value} label={label} palette={palette} size={15} />
          ))}
        </div>
      </CardFrame>
    ),
  };
}

// Organizations

async function orgCard(org: OrgFacts, params: BadgeParams): Promise<Drawing | null> {
  const rank = org.rank?.s;
  if (!rank) return null;
  const avatar = await fetchAvatar(org.avatarUrl);
  const top = topShare(rank, org.orgRankTotal);
  const countries = contributorCount(org, 'countries');
  const stats = [
    { value: formatCompact(org.s ?? 0), label: 'stars' },
    ...(org.pulse ? [{ value: formatFull(org.pulse.active12), label: 'active in 12 mo' }] : []),
    ...(countries !== null ? [{ value: formatFull(countries), label: 'countries' }] : []),
  ];
  return {
    width: 400,
    height: 160,
    draw: (palette) => (
      <CardFrame palette={palette} logo={params.logo} name={org.login} width={400} height={160}>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <Avatar src={avatar} size={34} palette={palette} square />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 12 }}>
            <Num size={20}>#{formatFull(rank)}</Num>
            <div style={{ display: 'flex', color: palette.muted }}>
              {['organization', top].filter(Boolean).join(dot)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {org.topRepos.slice(0, 3).map((repo) => (
            <div
              key={repo.nameWithOwner}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, lineHeight: 1.35 }}
            >
              <div
                style={{
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 260,
                }}
              >
                {repo.nameWithOwner}
              </div>
              <Num color={palette.muted}>{repo.rank ? `#${formatFull(repo.rank)}` : '–'}</Num>
            </div>
          ))}
        </div>
        <Line color={palette.muted} style={{ marginTop: 8 }}>
          {stats.map(({ value, label }, index) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <Num color={palette.text}>{`${index ? '  ' : ''}${value}`}</Num>
              <Words>{` ${label}`}</Words>
            </div>
          ))}
        </Line>
      </CardFrame>
    ),
  };
}

// Contributors walls

function wallFooter(entity: RepoFacts | UserFacts | OrgFacts, wall: ContributorsWall): string {
  const join = (parts: (string | null)[]) => parts.filter(Boolean).join(dot);
  const countries = entity.kind === 'user' ? null : contributorCount(entity, 'countries');
  const countriesText = countries !== null ? `${formatFull(countries)} countries` : null;
  if (entity.kind === 'repo') {
    return join([entity.pulse ? `${formatFull(entity.pulse.active12)} in 12 mo` : null, countriesText]);
  }
  if (entity.kind === 'org') {
    return join([
      entity.pulse ? `${formatFull(entity.pulse.active12)} active in 12 mo` : null,
      entity.reposCount ? `${formatFull(entity.reposCount)} repos` : null,
      entity.pulse ? `+${formatFull(entity.pulse.new12)} new` : null,
      countriesText,
    ]);
  }
  const legends = wall.entries.filter(({ tier }) => tier === 7).length;
  return join([
    `${formatFull(wall.total)} contributors${entity.wallRepos ? ` across ${formatFull(entity.wallRepos)} repos` : ''}`,
    legends ? `${formatFull(legends)} ${legends === 1 ? 'Legend' : 'Legends'}` : null,
  ]);
}

async function contributorsWall(
  entity: RepoFacts | UserFacts | OrgFacts,
  params: BadgeParams,
): Promise<Drawing | null> {
  const wall = wallOf(entity, params.order);
  if (!wall || wall.entries.length < 3) return null;
  const { shown, more, height } = wallLayout(wall, params.rows);
  const avatars = await fetchAvatars(shown.map(({ avatarUrl }) => avatarUrl));
  const name = entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
  const title =
    params.order === 'newest'
      ? entity.kind === 'repo'
        ? 'newest among top contributors'
        : 'newest contributors'
      : params.order === 'contributions'
        ? 'contributors by contributions'
        : 'contributors';
  const gridWidth = WALL_COLUMNS * WALL_AVATAR + (WALL_COLUMNS - 1) * WALL_GAP;
  const footer = wallFooter(entity, wall);

  return {
    width: WALL_WIDTH,
    height,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title={title}
        name={name}
        width={WALL_WIDTH}
        height={height}
        scale={1.5}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: gridWidth }}>
            {shown.map((person, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  marginRight: index % WALL_COLUMNS === WALL_COLUMNS - 1 ? 0 : WALL_GAP,
                  marginTop: index >= WALL_COLUMNS ? WALL_GAP : 0,
                }}
              >
                <Avatar
                  src={avatars[index]}
                  size={WALL_AVATAR}
                  palette={palette}
                  tier={params.tiers ? person.tier : null}
                />
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 16,
            fontSize: 13,
            color: palette.muted,
          }}
        >
          <div style={{ display: 'flex' }}>{footer}</div>
          {more ? (
            <div style={{ display: 'flex', marginTop: 4 }}>{`and ${formatFull(more)} more on GitRanks`}</div>
          ) : null}
        </div>
      </CardFrame>
    ),
  };
}

/**
 * The drawing of a card or chart, or `null` when it has never applied to the entity. `star-history` is drawn by its
 * own renderer and never comes here.
 */
export async function prepareDrawing(
  entity: RepoFacts | UserFacts | OrgFacts,
  id: string,
  params: BadgeParams,
  now = new Date(),
): Promise<Drawing | null> {
  if (entity.kind === 'repo') {
    switch (id) {
      case 'rank-card':
        return repoRankCard(entity, params);
      case 'stars-card':
        return repoStarsCard(entity, params, now);
      case 'starred-by-card':
        return repoStarredByCard(entity, params);
      case 'community-card':
        return repoCommunityCard(entity, params);
      case 'tier-card':
        return repoTierCard(entity, params);
      case 'contributors-chart':
        return contributorsChart(entity, params);
      case 'contributors-wall':
        return contributorsWall(entity, params);
    }
  }
  if (entity.kind === 'user') {
    switch (id) {
      case 'profile-card':
        return userProfileCard(entity, params);
      case 'count-chart':
        return userCountChart(entity, params, now);
      case 'contributors-wall':
        // Hidden for now: the drawing is kept for when developers' own repositories have contributor analytics.
        return USER_WALL_OFFERED ? contributorsWall(entity, params) : null;
    }
  }
  if (entity.kind === 'org') {
    switch (id) {
      case 'org-card':
        return orgCard(entity, params);
      case 'contributors-chart':
        return contributorsChart(entity, params);
      case 'contributors-wall':
        return contributorsWall(entity, params);
    }
  }
  return null;
}

/** The drawing a card or chart shows where it has never applied: its frame and "not yet". */
export function notYetDrawing(
  title: string,
  name: string,
  size: { width: number; height: number },
  logo: boolean,
): Drawing {
  const scale = size.width >= 800 ? 1.5 : 1;
  return {
    ...size,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={logo}
        title={title}
        name={name}
        width={size.width}
        height={size.height}
        scale={scale}
      >
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            color: palette.muted,
            fontSize: 13 * scale,
          }}
        >
          not yet on GitRanks
        </div>
      </CardFrame>
    ),
  };
}
