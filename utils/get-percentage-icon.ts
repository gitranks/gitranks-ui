import type { IconType } from 'react-icons';
import {
  TbPercentage10,
  TbPercentage20,
  TbPercentage25,
  TbPercentage30,
  TbPercentage33,
  TbPercentage40,
  TbPercentage50,
  TbPercentage60,
  TbPercentage66,
  TbPercentage70,
  TbPercentage75,
  TbPercentage80,
  TbPercentage90,
  TbPercentage100,
} from 'react-icons/tb';

const PERCENTAGE_ICONS: { value: number; Icon: IconType }[] = [
  { value: 10, Icon: TbPercentage10 },
  { value: 20, Icon: TbPercentage20 },
  { value: 25, Icon: TbPercentage25 },
  { value: 30, Icon: TbPercentage30 },
  { value: 33, Icon: TbPercentage33 },
  { value: 40, Icon: TbPercentage40 },
  { value: 50, Icon: TbPercentage50 },
  { value: 60, Icon: TbPercentage60 },
  { value: 66, Icon: TbPercentage66 },
  { value: 70, Icon: TbPercentage70 },
  { value: 75, Icon: TbPercentage75 },
  { value: 80, Icon: TbPercentage80 },
  { value: 90, Icon: TbPercentage90 },
  { value: 100, Icon: TbPercentage100 },
] as const;

export type PercentageIconResult = {
  Icon: IconType;
  fillClass: 'text-positive' | 'text-negative' | 'text-warning' | undefined;
};

export function getPercentageIcon(percentage: number): PercentageIconResult {
  const p = Math.max(0, Math.min(100, percentage));
  let closest = PERCENTAGE_ICONS[PERCENTAGE_ICONS.length - 1]!;

  for (const entry of PERCENTAGE_ICONS) {
    if (entry.value >= p) {
      closest = entry;
      break;
    }
  }
  const fillClass: PercentageIconResult['fillClass'] =
    p > 66 ? 'text-positive' : p < 33 ? 'text-negative' : 'text-warning';
  return { Icon: closest.Icon, fillClass };
}
