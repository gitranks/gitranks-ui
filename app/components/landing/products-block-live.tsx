'use client';

import { useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';

import { ProductsBlock, ProductsBlockGrow } from './products-block';
import { HOME_PRODUCTS_URL, type HomeProductsAnswer, homeProductsOf } from './products-block-read';
import type { HomeProducts } from './products-block-words';
import { SERVED_BUILD_VIEWER, useBuildViewer } from '@/components/build/build-viewer';
import { useBuildCardSide } from '@/components/build/home-card-live';
import type { CourseInLine } from '@/lib/learn/courses-line';

/**
 * How long the browser waits for the cards: the API gives each half 1.5 seconds and answers them together, so this
 * leaves room for the trip. A later answer is dropped and the promotions stay.
 */
export const HOME_PRODUCTS_WAIT_MS = 3_000;

/** The promotions word no time; this stands in for the clock until the person's cards arrive. */
const PROMOTIONS_NOW = new Date(0);

type Personal = { viewer: string; products: HomeProducts; now: Date };

/** The signed-in person's cards, asked once the page is up; null signed out, while waiting, and on any failure. */
export function useHomeProducts(viewer: string | undefined): Personal | null {
  const [personal, setPersonal] = useState<Personal | null>(null);

  useEffect(() => {
    if (!viewer) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HOME_PRODUCTS_WAIT_MS);
    fetch(HOME_PRODUCTS_URL, { signal: controller.signal })
      .then(async (res) => (res.ok ? ((await res.json()) as HomeProductsAnswer) : null))
      .then((answer) => {
        const products = homeProductsOf(answer?.products);
        if (products && !controller.signal.aborted) setPersonal({ viewer, products, now: new Date() });
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [viewer]);

  return personal?.viewer === viewer ? personal : null;
}

/**
 * The home page's block as served: the promotions with the cached page, the same for everyone; for a signed-in person,
 * their cards' words change in place once read, and each card keeps its size. `contribute`: Contribute is launched, so
 * its card is drawn. `courses`: Learn's live courses, read with the cached page, which Learn's promotion names.
 *
 * For a viewer Build is open to, the block with Build's card takes its place. The server cannot know who that is on a
 * shared page, so it serves today's block, and the browser changes it once, when it knows both that Build is open and
 * what Build's card says (or the wait is over). Once Build is open to everyone the server serves the three cards.
 */
export const ProductsBlockLive: FC<{ contribute: boolean; courses?: readonly CourseInLine[] }> = ({
  contribute,
  courses,
}) => {
  const { data: session, status } = useSession();
  const viewer = status === 'authenticated' && session && !session.error ? session.user?.githubLogin : undefined;
  const personal = useHomeProducts(viewer);
  const build = useBuildViewer();
  const buildRead = useBuildCardSide(build.open);
  if (build.open && (buildRead.settled || SERVED_BUILD_VIEWER.open)) {
    return (
      <ProductsBlockGrow
        products={personal?.products ?? null}
        build={{ home: buildRead.home, builds: buildRead.builds, hasBuild: build.hasBuild }}
        now={personal?.now ?? PROMOTIONS_NOW}
        contribute={contribute}
        courses={courses}
      />
    );
  }
  return (
    <ProductsBlock
      products={personal?.products ?? null}
      now={personal?.now ?? PROMOTIONS_NOW}
      contribute={contribute}
      courses={courses}
    />
  );
};
