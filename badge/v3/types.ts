/** The three kinds of entity a badge can be made for, as the URL names them. */
export type EntityKind = 'user' | 'org' | 'repo';

/** Shields are 20px high; cards are small panels; charts are wide drawings. */
export type BadgeFormat = 'shield' | 'card' | 'chart';

export type ImageFormat = 'svg' | 'png';

/**
 * One list of schemes: Auto (the default) follows the reader's theme; Night, Violet and Classic are fixed; Tier fills
 * the value with the badge's tier colour (tier shields only); Custom takes two picked colours (shields only).
 */
export type Scheme = 'auto' | 'night' | 'violet' | 'tier' | 'classic' | 'custom';
export type Theme = 'light' | 'dark';

/** A developer ranking. */
export type By = 'stars' | 'contributions' | 'followers';
export type Scope = 'global' | 'country';

/** Contributor facts a contributors shield can show as its value or its extra (spec §3.6). */
export type ContributorKey = '12mo' | 'month' | 'new' | '5yr' | 'countries' | 'legends';

export type WallOrder = 'popular' | 'contributions' | 'newest';

/** The colour role of a piece of text. */
export type Tone = 'positive' | 'gold' | { tier: number };

/** A piece of a segment's text. Numbers are set in the mono face. */
export type Run = { text: string; mono?: boolean; tone?: Tone };

/** A glyph that leads a segment: a developer tier's insignia or a repository tier's Cosmic glyph. */
export type SegmentIcon = { kind: 'user-tier' | 'repo-tier'; tier: number };

export type Segment = { runs: Run[]; icon?: SegmentIcon; tone?: Tone };

/** What a shield says: its label, its value and an optional extra. */
export type ShieldContent = { label: string; value: Segment; extra?: Segment };
