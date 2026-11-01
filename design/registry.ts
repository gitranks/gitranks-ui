import type { ReactElement } from 'react';

/** The product areas, one page each on the designs canvas, in this order. */
export const AREAS = {
  landing: 'Landing',
  profile: 'Developer profile',
  repo: 'Repository',
  org: 'Organization',
  rankings: 'Rankings',
  badges: 'Badges',
  contribute: 'Contribute',
} as const;

export type Area = keyof typeof AREAS;

/** What the export sets for each state and the mocks in `setup.tsx` read: its path, params and query, and who looks. */
export type DesignGlobals = {
  __designPath?: string;
  __designParams?: Record<string, string>;
  __designSearch?: string;
  __designSignedOut?: boolean;
};

/** One state of a screen, drawn from fixtures: a board on the canvas. */
export type ScreenState = {
  id: string;
  title: string;
  /** The path the app is at, with its query, for the tabs, links and steps that read them. */
  path: string;
  /** Drawn for a visitor who is not signed in; otherwise for the catalogue's signed-in viewer. */
  signedOut?: boolean;
  /** The board's width; 390 is a phone. */
  width?: number;
  /** The board's height: the page's height at `width`, rounded up. */
  height: number;
  render: () => ReactElement;
};

/** A screen of the app and the states the catalogue draws of it. */
export type Screen = {
  id: string;
  title: string;
  area: Area;
  route: string;
  /** The files that draw it, so an agent starts from the code. */
  sources: string[];
  states: ScreenState[];
};
