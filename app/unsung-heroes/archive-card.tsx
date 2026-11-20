import 'server-only';

import { ARCHIVE_LEAD, type Archive, formatCompactCount, formatFullCount } from './archive';
import { CARD_COLORS, drawSocialCard, Figure, Frame } from '@/lib/social-card/social-card';
import { heroWeekLabel } from '@/lib/unsung-hero/unsung-hero';

// The archive's link preview, 1200×630, in the site's light colours: this week's hero (its name, line, downloads and
// stars), or in a week with none, the archive itself with its totals.

const { muted: MUTED, positive: POSITIVE, rule: RULE } = CARD_COLORS;

/** A long `owner/name` gets smaller type, so it stays on two lines at most. */
const nameSize = (name: string) => (name.length > 44 ? 48 : name.length > 28 ? 58 : 72);

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
  return drawSocialCard(archive?.live ? <HeroCard hero={archive.live} /> : <ArchiveOnlyCard archive={archive} />);
}
