// import { MetadataRoute } from "next";

// export async function generateSitemaps() {
//   // Fetch the total number of products and calculate the number of sitemaps needed
//   return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
// }

// export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
//   // Google's limit is 50,000 URLs per sitemap
//   const start = id * 50000;
//   const end = start + 50000;
//   const products = await getProducts(`SELECT id, date FROM products WHERE id BETWEEN ${start} AND ${end}`);

//   return products.map((product) => ({
//     url: `${BASE_URL}/product/${product.id}`,
//     lastModified: product.date,
//   }));
// }
