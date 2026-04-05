import type { MetadataRoute } from "next";
import { fetchProducts } from "@/lib/db-products";

const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "https://oar-ore.com";

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchProducts();
  const collections = Array.from(new Set(products.map((product) => product.collection))).filter(Boolean);

  const staticRoutes = [
    "",
    "/products",
    "/cart",
    "/checkout",
    "/orders",
    "/login",
    "/signup",
    "/contact",
  ];

  const productRoutes = products.map((product) => `/products/${product.slug}`);
  const collectionRoutes = collections.map((collection) => `/collections/${normalizeSlug(collection)}`);

  return [...staticRoutes, ...productRoutes, ...collectionRoutes].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/products") || path.startsWith("/collections") ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}

