'use cache';

import { cacheLife } from 'next/cache';

import { GallerySection, galleryTiles } from './components/gallery-section';
import { GALLERY_SECTIONS } from './gallery-badges';
import { fetchShowcaseNames, loadShowcase } from './gallery-showcase';

export default async function BadgeGallery() {
  const { names, ok: namesOk } = await fetchShowcaseNames();
  const showcases = await Promise.all(GALLERY_SECTIONS.map(({ kind }) => loadShowcase(kind, names[kind])));
  const now = new Date();
  // A section left out for want of its #1 comes back within minutes; so does an image that waits on a read and
  // carries the render's stamp (see `pendingQuery`).
  const stamped = GALLERY_SECTIONS.some(({ kind }, index) =>
    galleryTiles(kind, showcases[index].facts, now).some(({ pending }) => pending),
  );
  if (namesOk && showcases.every(({ ok }) => ok) && !stamped) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  return (
    <div className="flex flex-col gap-8">
      {GALLERY_SECTIONS.map((section, index) => (
        <GallerySection key={section.kind} {...section} entity={showcases[index].facts} now={now} />
      ))}
    </div>
  );
}
