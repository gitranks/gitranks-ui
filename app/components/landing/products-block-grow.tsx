import type { FC } from 'react';

import { ProductCard } from './products-block';
import {
  contributeCardOf,
  type HomeCardWords,
  type HomeProducts,
  homePromosOf,
  learnCardOf,
  showsContributeOf,
} from './products-block-words';
import { BUILD_CARD_PROMO, type BuildCardSide, type BuildCardWords, buildCardOf } from '@/lib/build/home-card';
import type { CourseInLine } from '@/lib/learn/courses-line';

/* The home page's block: Learn's, Build's and Contribute's cards. */

const NO_COURSES: readonly CourseInLine[] = [];

/** The heading and line of the block. */
export const GROW_HEADING = 'Learn, build, and contribute to open source';
export const GROW_LINE = 'All three work with your own coding agent, on real code.';
/** The same without Contribute's card (Contribute not launched, and the person does not use it). */
export const GROW_NO_CONTRIBUTE_HEADING = 'Learn and build with your own coding agent';
export const GROW_NO_CONTRIBUTE_LINE = 'Both work with your own coding agent, on real code.';

/** The block's heading and line with Build's card: all three products', or Learn's and Build's. */
export const growWordsOf = (both: boolean): { heading: string; line: string } =>
  both
    ? { heading: GROW_HEADING, line: GROW_LINE }
    : { heading: GROW_NO_CONTRIBUTE_HEADING, line: GROW_NO_CONTRIBUTE_LINE };

/** Build's card as the block draws it, from its own words. */
const buildWordsOf = (words: BuildCardWords): HomeCardWords => ({
  product: 'BUILD',
  name: 'GitRanks Build',
  mark: words.isNew ? 'New' : null,
  title: words.title,
  line: words.line,
  action: words.action,
  href: words.href,
  personal: words.personal,
});

/** Build's promotion, the same for everyone, with "New". */
export const BUILD_HOME_PROMO: HomeCardWords = buildWordsOf(BUILD_CARD_PROMO);

/**
 * Build's card: the promotion, with "New", for someone with no build; for someone with one, the first of a test that
 * waits, the gold test, the build touched last, the projects built (see `buildCardOf`).
 */
export const buildCardWordsOf = (side: BuildCardSide | null): HomeCardWords => buildWordsOf(buildCardOf(side));

/**
 * The block with Build's card: three cards of one size, in the order Learn, Build, Contribute, in three columns from a
 * wide screen and in one below it. Learn's and Contribute's cards say what they say in today's block; Build's says
 * what it has for the person (`build`, their side as read; none promotes it). `contribute` false leaves Contribute's
 * card out as today's block does, and Learn and Build share the row.
 */
export const ProductsBlockGrow: FC<{
  products?: HomeProducts | null;
  build?: BuildCardSide | null;
  now: Date;
  contribute?: boolean;
  id?: string;
  courses?: readonly CourseInLine[];
}> = ({ products = null, build = null, now, contribute = true, id = 'products', courses = NO_COURSES }) => {
  const promos = homePromosOf(courses);
  const both = showsContributeOf(contribute, products);
  const { heading, line } = growWordsOf(both);
  return (
    <section aria-labelledby={id} className="py-12 lg:py-16" data-products-block={both ? 'grow' : 'grow-learn-build'}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4">
        <div className="flex flex-col gap-2">
          <h2 id={id} className="m-0 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {heading}
          </h2>
          <p className="m-0 max-w-prose text-muted-foreground">{line}</p>
        </div>
        <div className={`grid grid-cols-1 gap-4 ${both ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
          <ProductCard card={learnCardOf(products, now, promos)} promo={promos.LEARN} />
          <ProductCard card={buildCardWordsOf(build)} promo={BUILD_HOME_PROMO} />
          {both ? <ProductCard card={contributeCardOf(products)} promo={promos.CONTRIBUTE} /> : null}
        </div>
      </div>
    </section>
  );
};
