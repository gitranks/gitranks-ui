import path from 'path';
import { promises as fs } from 'fs';
import { FontWeight, SatoriOptions } from 'satori';
import { emojiMapping } from './emoji-mapping';

async function loadFont(fontWeight: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), 'public', 'fonts', `Inter-${fontWeight}.ttf`));
}

const fontWeightToName: Record<number, string> = {
  400: 'Regular',
  600: 'SemiBold',
  700: 'Bold',
};

const fontCache: Partial<Record<FontWeight, Buffer>> = {};

type SatoriParams = {
  fontOptions: { style: 'normal' | 'italic'; weight: FontWeight }[];
  width: number;
  height: number;
};

export async function getSatoriConfig({ fontOptions, width, height }: SatoriParams): Promise<SatoriOptions> {
  const fontPromises = fontOptions.map<Promise<SatoriOptions['fonts'][number]>>(async ({ style, weight }) => {
    if (!fontWeightToName[weight]) {
      throw new Error(`No font mapping found for weight ${weight}`);
    }

    if (!fontCache[weight]) {
      fontCache[weight] = await loadFont(fontWeightToName[weight]);
    }

    return {
      name: 'Inter',
      data: fontCache[weight],
      weight,
      style,
    };
  });

  const fonts = await Promise.all(fontPromises);

  return {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (_, segment: string) => emojiMapping[segment] || '',
  };
}
