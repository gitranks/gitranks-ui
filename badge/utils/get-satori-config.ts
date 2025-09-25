import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { FontWeight, SatoriOptions } from 'satori';

import { emojiMapping } from './emoji-mapping';

async function loadFont(fontName: string, fontWeight: string, fontStyle: string): Promise<Buffer> {
  const fontFileName = `${fontName}-${fontWeight}${fontStyle}.ttf`;
  return fs.readFile(path.join(process.cwd(), 'public', 'fonts', fontFileName));
}

const fontWeightToName: Record<number, string> = {
  400: 'Regular',
  600: 'SemiBold',
  700: 'Bold',
};

const fontCache: Record<string, Buffer> = {};

type FontOption = {
  name?: 'Inter' | 'Verdana';
  style?: 'normal' | 'italic';
  weight: FontWeight;
};

type SatoriParams = {
  fontOptions: FontOption[];
  width?: number;
  height: number;
};

export async function getSatoriConfig({ fontOptions, width, height }: SatoriParams): Promise<SatoriOptions> {
  const fontPromises = fontOptions.map<Promise<SatoriOptions['fonts'][number]>>(
    async ({ name = 'Inter', style = 'normal', weight = 400 }) => {
      if (!fontWeightToName[weight]) {
        throw new Error(`No font mapping found for weight ${weight}`);
      }

      const fontStyle = style === 'normal' ? '' : `${style.charAt(0).toUpperCase() + style.slice(1)}`;
      const fontKey = `${name}-${weight}${fontStyle}`;

      fontCache[fontKey] ??= await loadFont(name, fontWeightToName[weight], fontStyle);

      return {
        name,
        data: fontCache[fontKey],
        weight,
        style,
      };
    },
  );

  const fonts = await Promise.all(fontPromises);

  return {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (_, segment: string) => emojiMapping[segment] || '',
  };
}
