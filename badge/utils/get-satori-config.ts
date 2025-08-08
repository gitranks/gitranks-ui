import { promises as fs } from 'fs';
import path from 'path';

import { FontWeight, SatoriOptions } from 'satori';

import { emojiMapping } from './emoji-mapping';

async function loadFont(fontName: string, fontWeight: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), 'public', 'fonts', `${fontName}-${fontWeight}.ttf`));
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

      const fontKey = `${name}-${weight}`;

      fontCache[fontKey] ??= await loadFont(name, fontWeightToName[weight]);

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
