import 'server-only';

import satori from 'satori';

import { ARCHIVE_LEAD, type Archive, formatCompactCount, formatFullCount } from './archive';
import { ARCHIVE_CARD_SIZE } from './seo';
import { svgToPng } from '@/badge/repo/render-star-history-badge';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { heroWeekLabel } from '@/lib/unsung-hero/unsung-hero';

// The archive's link preview, 1200×630, in the site's light colours: this week's hero (its name, line, downloads and
// stars), or in a week with none, the archive itself with its totals.

const INK = '#0a0a0a';
const MUTED = '#525252';
const VIOLET = '#7f22fe';
const POSITIVE = '#16a34a';
const PAPER = '#ffffff';
const RULE = '#e5e5e5';

const FONTS = [
  { weight: 400 as const },
  { weight: 600 as const },
  { weight: 700 as const },
  { name: 'JetBrains Mono' as const, weight: 700 as const },
];

/** A long `owner/name` gets smaller type, so it stays on two lines at most. */
const nameSize = (name: string) => (name.length > 44 ? 48 : name.length > 28 ? 58 : 72);

function Figure({ value, label, color = INK }: Readonly<{ value: string; label: string; color?: string }>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 60, color }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>{label}</div>
    </div>
  );
}

function Frame({ eyebrow, children }: Readonly<{ eyebrow: string; children: React.ReactNode }>) {
  return (
    <div
      style={{
        width: ARCHIVE_CARD_SIZE.width,
        height: ARCHIVE_CARD_SIZE.height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 72px',
        background: PAPER,
        color: INK,
        fontFamily: 'Inter',
        borderTop: `12px solid ${VIOLET}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 3, color: VIOLET }}>
          {eyebrow.toUpperCase()}
        </div>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>GitRanks</div>
      </div>
      {children}
    </div>
  );
}

function HeroCard({ hero }: Readonly<{ hero: NonNullable<Archive['live']> }>) {
  const name = hero.repo.nameWithOwner;
  return (
    <Frame eyebrow={`Unsung hero · ${heroWeekLabel(hero)}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: nameSize(name), fontWeight: 700, wordBreak: 'break-all' }}>{name}</div>
        <div style={{ display: 'flex', fontSize: 32, color: MUTED }}>{hero.line}</div>
      </div>
      <div style={{ display: 'flex', gap: 80, borderTop: `2px solid ${RULE}`, paddingTop: 32 }}>
        <Figure value={formatCompactCount(hero.weeklyDownloads)} label="downloads a week" />
        {hero.starsAtStart !== null && <Figure value={formatFullCount(hero.starsAtStart)} label="stars" />}
      </div>
    </Frame>
  );
}

function ArchiveOnlyCard({ archive }: Readonly<{ archive: Archive | null }>) {
  const heroes = archive?.totals.heroes ?? 0;
  return (
    <Frame eyebrow="Open source, ranked.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', fontSize: 80, fontWeight: 700 }}>Unsung heroes</div>
        <div style={{ display: 'flex', fontSize: 32, color: MUTED, maxWidth: 1000 }}>{ARCHIVE_LEAD}</div>
      </div>
      {archive && heroes > 0 ? (
        <div style={{ display: 'flex', gap: 80, borderTop: `2px solid ${RULE}`, paddingTop: 32 }}>
          <Figure value={formatFullCount(heroes)} label="heroes so far" />
          <Figure
            value={`+${formatFullCount(archive.totals.starsGained)}`}
            label="stars while featured"
            color={POSITIVE}
          />
        </div>
      ) : (
        <div style={{ display: 'flex' }} />
      )}
    </Frame>
  );
}

/** The card as a PNG; `null` (the archive cannot be read) draws the archive without totals. */
export async function drawArchiveCard(archive: Archive | null): Promise<Uint8Array<ArrayBuffer>> {
  const node = archive?.live ? <HeroCard hero={archive.live} /> : <ArchiveOnlyCard archive={archive} />;
  const svg = await satori(node, await getSatoriConfig({ fontOptions: FONTS, ...ARCHIVE_CARD_SIZE }));
  return svgToPng(svg, ARCHIVE_CARD_SIZE.width);
}
