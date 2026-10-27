'use cache';

import { cacheLife } from 'next/cache';

import { GallerySection } from './components/gallery-section';
import { GALLERY_SECTIONS } from './gallery-badges';
import { fetchShowcaseNames, loadShowcase } from './gallery-showcase';

export default async function BadgeGallery() {
  const { names, ok: namesOk } = await fetchShowcaseNames();
  const showcases = await Promise.all(GALLERY_SECTIONS.map(({ kind }) => loadShowcase(kind, names[kind])));
  // A section left out for want of its #1 comes back within minutes.
  if (namesOk && showcases.every(({ ok }) => ok)) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      {GALLERY_SECTIONS.map((section, index) => (
        <GallerySection key={section.kind} {...section} entity={showcases[index].facts} now={now} />
      ))}
    </div>
  );
}
