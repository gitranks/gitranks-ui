import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HOME_NOW, homeProducts } from '@/app/components/landing/__fixtures__/products-block';
import { ProductsBlock } from '@/app/components/landing/products-block';
import type { HomeProducts } from '@/app/components/landing/products-block-words';

/**
 * The home page's block for Contribute and Learn, for each viewer, from fixtures, before the home page uses it. Held
 * back from the export (`exported: false`): the export is at its file limit.
 */

/** A labelled part of a board that shows several states one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col border-t pt-4">
    <span className="mx-auto w-full max-w-7xl px-4 text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const block = (products: HomeProducts | null, id?: string) => (
  <ProductsBlock products={products} now={HOME_NOW} id={id} />
);

export const HOME_PRODUCT_SCREENS: Screen[] = [
  {
    id: 'home-products-block',
    title: 'Contribute and Learn on the home page',
    area: 'landing',
    route: '/',
    exported: false,
    sources: ['app/components/landing/products-block.tsx', 'app/components/landing/products-block-words.ts'],
    states: [
      {
        id: 'visitor',
        title: 'Not signed in, or using neither: both cards promote',
        path: '/',
        signedOut: true,
        height: 500,
        render: () => <main>{block(homeProducts.visitor)}</main>,
      },
      {
        id: 'viewers',
        title: 'A learner, a contributor, and someone who uses both',
        path: '/',
        height: 1300,
        render: () => (
          <main>
            <Case title="A learner who does not contribute">{block(homeProducts.learner, 'products-learner')}</Case>
            <Case title="A contributor who does not learn">
              {block(homeProducts.contributor, 'products-contributor')}
            </Case>
            <Case title="Someone who uses both">{block(homeProducts.both, 'products-both')}</Case>
          </main>
        ),
      },
      {
        id: 'cards',
        title: 'What a card says to someone who uses the product, the first that is true',
        path: '/',
        height: 1300,
        render: () => (
          <main>
            <Case title="Pull requests open, none needs them; a next lesson">
              {block(homeProducts.open, 'products-open')}
            </Case>
            <Case title="No pull request open; nothing due, a review planned">
              {block(homeProducts.quiet, 'products-quiet')}
            </Case>
            <Case title="A learner with nothing due, no next lesson and no review planned">
              {block(homeProducts.learnerNothing, 'products-learner-nothing')}
            </Case>
          </main>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone: the cards one under the other',
        path: '/',
        width: 390,
        height: 800,
        render: () => <main>{block(homeProducts.both)}</main>,
      },
    ],
  },
];
