import { CANVAS_MID } from './rank-chart.consts';

export const toXY = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CANVAS_MID + r * Math.cos(rad), CANVAS_MID + r * Math.sin(rad)];
};
