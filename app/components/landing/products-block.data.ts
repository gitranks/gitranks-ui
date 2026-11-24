import 'server-only';

import { parse } from 'graphql';

import { homeProductsOf } from './products-block-read';
import type { HomeProducts } from './products-block-words';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

const HomeProductsDocument = parse(`query HomeProducts {
  homeProducts {
    usesContribute
    usesLearn
    contribute { state count repo box round }
    learn { state count lesson { slug title } course group at }
  }
}`) as DocumentNode<{ homeProducts: unknown }>;

/**
 * The home block's two cards for a signed-in person, read when their browser asks: null when the API has none for them
 * and on any failure, so the block keeps its promotions.
 */
export async function loadHomeProducts(githubLogin: string): Promise<HomeProducts | null> {
  try {
    const { homeProducts } = await graphqlDirect(HomeProductsDocument, undefined, { source: 'client', githubLogin });
    return homeProductsOf(homeProducts);
  } catch {
    return null;
  }
}
