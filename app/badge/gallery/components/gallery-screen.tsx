import type { FC } from 'react';

import { GALLERY_SECTIONS } from '../gallery-badges';
import { GallerySection } from './gallery-section';
import type { EntityFacts } from '@/badge/v3/facts';

/** The gallery's sections, each drawn for its kind's #1: `leaders` in the order of `GALLERY_SECTIONS`. */
export const GalleryScreen: FC<{ leaders: (EntityFacts | null)[]; now: Date }> = ({ leaders, now }) => (
  <div className="flex flex-col gap-8">
    {GALLERY_SECTIONS.map((section, index) => (
      <GallerySection key={section.kind} {...section} entity={leaders[index]} now={now} />
    ))}
  </div>
);
