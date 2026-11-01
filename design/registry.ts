import type { ReactElement } from 'react';

/** The product areas, one page each on the designs canvas, in this order. */
export const AREAS = {
  contribute: 'Contribute',
} as const;

export type Area = keyof typeof AREAS;

/** One state of a screen, drawn from fixtures: a board on the canvas. */
export type ScreenState = {
  id: string;
  title: string;
  /** The path the app is at, for the tabs and links that read it. */
  path: string;
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
