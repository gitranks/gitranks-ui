import type { ReactElement } from 'react';

import { CardFrame, Line, Num, sparkPaths, Words } from './card-frame';
import type { Drawing } from './cards';
import { packageGrowthOf, packagePerStarOf } from './catalogue';
import type { PackageFacts } from './facts';
import { formatCompact, formatCount, formatFull, perStarText } from './format';
import { Mark } from './glyphs';
import type { BadgeParams } from './params';
import { type CardPalette, toneColor } from './schemes';
import { MONO_FONT } from './shield';
import {
  DOWNLOADS_UNIT_TEXT,
  downloadsCountOf,
  downloadsUnitOf,
  REGISTRIES,
  registryDownloadsText,
} from '@/lib/packages/registries';

/** A package's cards and chart. A package no repository with 100+ stars uses yet says "new", never "0". */

const dot = ' · ';

/** "npm · react", at the right of a card's eyebrow. */
export const packageFrameName = (pkg: Pick<PackageFacts, 'registry' | 'name'>) =>
  `${REGISTRIES[pkg.registry].label}${dot}${pkg.name}`;

const repos = (count: number) => (count === 1 ? 'repo' : 'repos');

/** "+16%", "−3%", "0%". */
const growthText = (change: number) =>
  change > 0 ? `+${formatFull(change)}%` : change < 0 ? `−${formatFull(-change)}%` : '0%';

/** The used-by card: how many repositories with 100+ stars use the package, their stars, and the top two. */
export function packageUsedByCard(pkg: PackageFacts, params: BadgeParams): Drawing {
  const count = pkg.dependentsCount;
  const top = pkg.dependents.slice(0, 2);
  return {
    width: 400,
    height: 120,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="used by"
        name={packageFrameName(pkg)}
        width={400}
        height={120}
      >
        {count > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <Line color={palette.muted} style={{ marginTop: 8, alignItems: 'baseline' }}>
              <Num size={22} color={palette.text}>
                {formatCount(count)}
              </Num>
              <Words>{` ${repos(count)} with 100+ stars ${count === 1 ? 'uses' : 'use'} it directly`}</Words>
            </Line>
            <Line color={palette.muted} style={{ marginTop: 4 }}>
              <Num color={palette.text}>{`${formatFull(pkg.dependentsStars)} ★`}</Num>
              <Words>{count === 1 ? ' on GitHub' : ' between them'}</Words>
            </Line>
            {top.length ? (
              <Line color={palette.muted} style={{ marginTop: 'auto', flexWrap: 'nowrap', overflow: 'hidden' }}>
                <Words>Top: </Words>
                {top.map((dependent, index) => (
                  <Line key={dependent.nameWithOwner} style={{ flexWrap: 'nowrap' }}>
                    <Words color={palette.text}>{dependent.nameWithOwner}</Words>
                    <Words>{` ${formatCompact(dependent.stars)}★${index < top.length - 1 ? dot : ''}`}</Words>
                  </Line>
                ))}
              </Line>
            ) : null}
          </div>
        ) : (
          <NewPackage palette={palette} />
        )}
      </CardFrame>
    ),
  };
}

/** "new" where a count would be 0. */
function NewPackage({ palette }: Readonly<{ palette: CardPalette }>): ReactElement {
  return (
    <Line color={palette.muted} style={{ marginTop: 8, alignItems: 'baseline' }}>
      <Num size={22} color={palette.text}>
        new
      </Num>
      <Words>{' not yet used by a repo with 100+ stars'}</Words>
    </Line>
  );
}

/**
 * The downloads card: a week's downloads, year over year, and the last 52 weeks as a line; on a registry counted a
 * month at a time, last month's downloads and the last 12 months as the line.
 */
export function packageDownloadsCard(pkg: PackageFacts, params: BadgeParams): Drawing | null {
  const downloads = pkg.downloads;
  const unit = downloadsUnitOf(pkg.registry);
  const counted = downloadsCountOf(unit, downloads);
  if (!downloads || !counted) return null;
  const growth = packageGrowthOf(pkg);
  const points = unit === 'month' ? downloads.months.slice(-12) : downloads.weeks.slice(-52);
  const series = points.map(({ downloads: count }) => count);
  const { line, area } = series.length > 1 ? sparkPaths(series, 366, 34) : { line: null, area: null };
  return {
    width: 400,
    height: 120,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="downloads"
        name={packageFrameName(pkg)}
        width={400}
        height={120}
      >
        <Line color={palette.muted} style={{ marginTop: 8, alignItems: 'baseline' }}>
          <Num size={22} color={palette.text}>
            {formatCompact(counted.last)}
          </Num>
          <Words>{` ${registryDownloadsText(pkg.registry)}`}</Words>
          {growth !== null ? (
            <Words color={growth > 0 ? toneColor('positive', palette.ground, palette.text) : palette.muted}>
              {`${dot}${growthText(growth)} year over year`}
            </Words>
          ) : null}
        </Line>
        {line && area ? (
          <svg width={366} height={34} viewBox="0 0 366 34" style={{ marginTop: 'auto' }} aria-hidden="true">
            <path d={area} fill={palette.accent} fillOpacity="0.1" />
            <path d={line} fill="none" stroke={palette.accent} strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ) : null}
      </CardFrame>
    ),
  };
}

function PackageStat({
  value,
  label,
  palette,
  first,
}: Readonly<{ value: string; label: string; palette: CardPalette; first: boolean }>) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        color: palette.muted,
        ...(first ? {} : { borderLeft: `1px solid ${palette.border}`, paddingLeft: 12 }),
      }}
    >
      <Num size={20} color={palette.text}>
        {value}
      </Num>
      <div style={{ display: 'flex', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/**
 * The package card, a package's page's link preview: downloads a week (last month's, on a registry counted a month at
 * a time), 100+★ repos, GitHub stars, per star.
 */
export function packageCard(pkg: PackageFacts, params: BadgeParams): Drawing {
  const perStar = packagePerStarOf(pkg);
  const unit = downloadsUnitOf(pkg.registry);
  const counted = downloadsCountOf(unit, pkg.downloads);
  const stats = [
    ...(counted && unit
      ? [{ value: formatCompact(counted.last), label: `downloads ${DOWNLOADS_UNIT_TEXT[unit].per}` }]
      : []),
    { value: pkg.dependentsCount > 0 ? formatCount(pkg.dependentsCount) : 'new', label: '100+★ repos' },
    ...(pkg.repo ? [{ value: formatFull(pkg.repo.stars), label: 'GitHub stars' }] : []),
  ];
  return {
    width: 400,
    height: 120,
    draw: (palette) => (
      <CardFrame
        palette={palette}
        logo={params.logo}
        title="package"
        name={packageFrameName(pkg)}
        width={400}
        height={120}
      >
        <div style={{ display: 'flex', marginTop: 10, gap: 12 }}>
          {stats.map(({ value, label }, index) => (
            <PackageStat key={label} value={value} label={label} palette={palette} first={index === 0} />
          ))}
        </div>
        {perStar !== null ? (
          <Line color={palette.muted} style={{ marginTop: 'auto' }}>
            <Num color={palette.text}>{perStarText(perStar)}</Num>
            <Words> weekly downloads per star</Words>
          </Line>
        ) : null}
      </CardFrame>
    ),
  };
}

const CHART = { width: 1000, height: 400, name: 210, value: 72 } as const;

/** The used-by chart: the eight most-starred dependents as bars, archived ones marked and paler. */
export function packageUsedByChart(pkg: PackageFacts, params: BadgeParams): Drawing {
  const rows = pkg.dependents.slice(0, 8);
  const max = Math.max(1, ...rows.map(({ stars }) => stars));
  const count = pkg.dependentsCount;
  return {
    width: CHART.width,
    height: CHART.height,
    draw: (palette) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: CHART.width,
          height: CHART.height,
          padding: '24px 28px',
          backgroundColor: palette.background,
          border: `1px solid ${palette.border}`,
          borderRadius: 12,
          color: palette.text,
          fontFamily: 'Inter',
          fontWeight: 400,
          fontSize: 13,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, color: palette.muted }}>
            <div
              style={{
                display: 'block',
                fontSize: 22,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 680,
              }}
            >
              {pkg.name}
            </div>
            <div style={{ display: 'flex', marginTop: 4 }}>Most-starred repositories that use it directly</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color: palette.muted }}>
            <Num size={34} color={palette.text}>
              {count > 0 ? formatCount(count) : 'new'}
            </Num>
            <div style={{ display: 'flex' }}>{count > 0 ? `${repos(count)} with 100+ stars` : 'on GitRanks'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
          {rows.length ? (
            rows.map((row) => (
              <div key={row.nameWithOwner} style={{ display: 'flex', alignItems: 'center', height: 22, marginTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', width: CHART.name, flexShrink: 0 }}>
                  <div
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: row.archived ? CHART.name - 60 : CHART.name,
                    }}
                  >
                    {row.nameWithOwner}
                  </div>
                  {row.archived ? (
                    <div style={{ display: 'flex', marginLeft: 5, fontSize: 11, color: palette.muted }}>archived</div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', flexGrow: 1, flexBasis: 0, minWidth: 0, height: 14, marginLeft: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      width: `${Math.max(1, Math.round((row.stars / max) * 1000) / 10)}%`,
                      height: 14,
                      borderRadius: 3,
                      backgroundColor: palette.accent,
                      opacity: row.archived ? 0.45 : 1,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    width: CHART.value,
                    marginLeft: 12,
                    flexShrink: 0,
                    fontFamily: MONO_FONT,
                    fontWeight: 700,
                  }}
                >
                  {formatFull(row.stars)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', marginTop: 60, justifyContent: 'center', color: palette.muted }}>
              Not yet used by a repository with 100+ stars
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            fontSize: 11,
            color: palette.muted,
          }}
        >
          <div style={{ display: 'flex' }}>Stars on GitHub · direct dependents only, no forks</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {params.logo ? (
              <div style={{ display: 'flex', marginRight: 5 }}>
                <Mark size={13} colors={palette.mark} />
              </div>
            ) : null}
            gitranks.com
          </div>
        </div>
      </div>
    ),
  };
}
