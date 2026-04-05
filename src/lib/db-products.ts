import { prisma } from "@/lib/prisma";
import { toSafePrice } from "@/lib/price";
import { products as fallbackProducts } from "@/lib/products";
import { fromJson, toInputJson } from "@/lib/db-json";
import { Product, ProductCategory, ProductCoatingOption } from "@/lib/types";

const PRODUCT_IMAGE_PLACEHOLDER = "/file.svg";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  price: number;
  material: string;
  image: string;
  images: string[];
  collection: string;
  finish: string;
  stock: number;
  leadTimeDays: number;
  tags: string[];
  seoKeywords: string[];
  coatingOptions: unknown;
  isNew: boolean;
  isLimited: boolean;
};

function parseStock(input: unknown) {
  const numeric = Number(input ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function parseImageList(input: unknown, fallback?: unknown): string[] {
  const rawList: string[] = [];
  const uploadsPrefixPattern = /^\/?(?:public\/)?uploads\//i;

  const normalizeImagePath = (value: string) => {
    let trimmed = value.trim();
    if (!trimmed) return "";

    const asUrl = trimmed.match(/^https?:\/\/[^/]+(\/.*)?$/i);
    if (asUrl) {
      const pathPart = (asUrl[1] ?? "").trim();
      if (!pathPart || pathPart === "/") return "";
      trimmed = pathPart;
    }

    const marker = "/uploads/";
    const markerIndex = trimmed.toLowerCase().lastIndexOf(marker);
    if (markerIndex >= 0) {
      return trimmed.slice(markerIndex);
    }
    if (uploadsPrefixPattern.test(trimmed)) {
      return `/${trimmed.replace(uploadsPrefixPattern, "uploads/")}`;
    }
    if (trimmed.startsWith("/")) return trimmed;
    return `/${trimmed.replace(/^\/+/, "")}`;
  };

  const addToken = (value: string) => {
    const cleaned = value
      .trim()
      .replace(/^["'\[\]]+/, "")
      .replace(/["'\[\]]+$/, "");
    const normalized = normalizeImagePath(cleaned);
    if (normalized) rawList.push(normalized);
  };

  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item));
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          collect(JSON.parse(trimmed) as unknown);
          return;
        } catch {
          // normal parse
        }
      }

      trimmed.split(/[\n,]/).forEach((token) => addToken(token));
      return;
    }

    if (value && typeof value === "object") {
      const row = value as Record<string, unknown>;
      if (Array.isArray(row.images)) {
        collect(row.images);
        return;
      }
      if (Array.isArray(row.urls)) {
        collect(row.urls);
        return;
      }
      Object.values(row).forEach((item) => collect(item));
    }
  };

  collect(input);
  if (rawList.length === 0) {
    collect(fallback);
  }

  return Array.from(new Set(rawList));
}

function resolveServeableImagePath(webPath: string): string {
  const t = webPath.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.toLowerCase().startsWith("uploads/")) return `/${t}`;
  if (t.toLowerCase().startsWith("public/uploads/")) return `/${t.slice("public/".length)}`;
  if (t.startsWith("/")) return t;
  if (t.startsWith("//")) return "";
  return `/${t.replace(/^\/+/, "")}`;
}

function parseCoatingOptions(input: unknown): ProductCoatingOption[] {
  let rawList: unknown[] = [];
  if (Array.isArray(input)) {
    rawList = input;
  } else if (input && typeof input === "object") {
    const row = input as Record<string, unknown>;
    if (Array.isArray(row.options)) {
      rawList = row.options;
    } else {
      rawList = Object.entries(row).map(([key, value]) => {
        if (value && typeof value === "object") {
          return { id: key, ...(value as Record<string, unknown>) };
        }
        return { id: key, name: key, priceDelta: value };
      });
    }
  } else {
    return [];
  }

  return rawList
    .map((item) => {
      const row = item as Record<string, unknown> | undefined;
      const name = String(row?.name ?? row?.label ?? row?.title ?? row?.type ?? "").trim();
      if (!name) return null;
      const idFromPayload = String(row?.id ?? row?.key ?? row?.code ?? "").trim();
      const priceDelta = Math.round(
        toSafePrice(row?.priceDelta ?? row?.extraPrice ?? row?.amount ?? row?.price ?? 0),
      );
      const id = idFromPayload ? normalizeSlug(idFromPayload) : normalizeSlug(name);
      if (!id) return null;
      return { id, name, priceDelta };
    })
    .filter((item): item is ProductCoatingOption => item !== null);
}

function parseKeywordList(input: unknown, fallback?: unknown): string[] {
  const values: string[] = [];

  const collect = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item));
      return;
    }

    if (typeof value === "string") {
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => values.push(item));
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach((item) => collect(item));
    }
  };

  collect(input);
  if (values.length === 0) {
    collect(fallback);
  }

  return Array.from(new Set(values));
}

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

const PRODUCT_CATEGORIES = new Set([
  "Kolye",
  "Bileklik",
  "Pin",
  "Küpe",
  "Anahtarlık",
  "Aksesuar",
]);

function parseCategory(input: string): ProductCategory {
  const normalized = input.trim();
  if (!PRODUCT_CATEGORIES.has(normalized)) {
    return "Kolye";
  }
  return normalized as ProductCategory;
}

function normalizeProduct(doc: Partial<ProductRow>): Product {
  const rawImages = parseImageList(doc.images, doc.image);
  const images = Array.from(new Set(rawImages.map(resolveServeableImagePath).filter(Boolean)));
  const primaryImage = images[0] ?? PRODUCT_IMAGE_PLACEHOLDER;

  return {
    id: String(doc.id ?? doc.slug ?? ""),
    slug: String(doc.slug ?? ""),
    name: String(doc.name ?? ""),
    category: parseCategory(String(doc.category ?? "Kolye")),
    description: String(doc.description ?? ""),
    price: toSafePrice(doc.price),
    material: String(doc.material ?? ""),
    image: primaryImage,
    images,
    collection: String(doc.collection ?? "Atelier 01"),
    finish: String(doc.finish ?? "Ayna polisaj"),
    stock: parseStock(doc.stock ?? 12),
    leadTimeDays: Number(doc.leadTimeDays ?? 3),
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    seoKeywords: parseKeywordList(doc.seoKeywords, doc.tags),
    coatingOptions: parseCoatingOptions(doc.coatingOptions),
    isNew: Boolean(doc.isNew),
    isLimited: Boolean(doc.isLimited),
  };
}

function toProductPayload(body: unknown): Omit<Product, "id"> & { id?: string } {
  const b = body as Record<string, unknown> | undefined;
  const name = String(b?.name ?? "").trim();
  const slugFromBody = String(b?.slug ?? "").trim();
  const slug = slugFromBody ? normalizeSlug(slugFromBody) : normalizeSlug(name);

  const rawTags = b?.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t) => String(t).trim()).filter(Boolean)
    : String(rawTags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  const isNew = b?.isNew === true || b?.isNew === "true";
  const isLimited = b?.isLimited === true || b?.isLimited === "true";
  const images = parseImageList(b?.images, b?.image);
  const primaryImage = images[0] ?? "/products/aether.jpg";
  const seoKeywords = parseKeywordList(b?.seoKeywords, b?.tags);

  return {
    id: typeof b?.id === "string" && b.id.trim() ? b.id.trim() : undefined,
    slug,
    name,
    category: parseCategory(String(b?.category ?? "Kolye")),
    description: String(b?.description ?? ""),
    price: toSafePrice(b?.price),
    material: String(b?.material ?? ""),
    image: primaryImage,
    images,
    collection: String(b?.collection ?? "Atelier 01"),
    finish: String(b?.finish ?? "Ayna polisaj"),
    stock: parseStock(b?.stock),
    leadTimeDays: Number(b?.leadTimeDays ?? 3),
    tags,
    seoKeywords,
    coatingOptions: parseCoatingOptions(b?.coatingOptions),
    isNew,
    isLimited,
  };
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    if (!rows.length) return [];
    return rows.map((row) =>
      normalizeProduct({
        ...row,
        coatingOptions: fromJson(row.coatingOptions, []),
      }),
    );
  } catch {
    return fallbackProducts.map((product) => normalizeProduct(product));
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findUnique({ where: { slug } });
    if (!row) return null;
    return normalizeProduct({
      ...row,
      coatingOptions: fromJson(row.coatingOptions, []),
    });
  } catch {
    const fallback = fallbackProducts.find((p) => p.slug === slug);
    return fallback ? normalizeProduct(fallback) : null;
  }
}

export async function createProduct(body: unknown): Promise<Product> {
  const payload = toProductPayload(body);

  const row = await prisma.product.upsert({
    where: { slug: payload.slug },
    update: {
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      material: payload.material,
      image: payload.image,
      images: payload.images ?? [],
      collection: payload.collection,
      finish: payload.finish,
      stock: payload.stock,
      leadTimeDays: payload.leadTimeDays,
      tags: payload.tags,
      seoKeywords: payload.seoKeywords,
      coatingOptions: toInputJson(payload.coatingOptions ?? []),
      isNew: payload.isNew ?? false,
      isLimited: payload.isLimited ?? false,
    },
    create: {
      id: payload.id,
      slug: payload.slug,
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      material: payload.material,
      image: payload.image,
      images: payload.images ?? [],
      collection: payload.collection,
      finish: payload.finish,
      stock: payload.stock,
      leadTimeDays: payload.leadTimeDays,
      tags: payload.tags,
      seoKeywords: payload.seoKeywords,
      coatingOptions: toInputJson(payload.coatingOptions ?? []),
      isNew: payload.isNew ?? false,
      isLimited: payload.isLimited ?? false,
    },
  });

  return normalizeProduct({
    ...row,
    coatingOptions: fromJson(row.coatingOptions, []),
  });
}

export async function updateProduct(slug: string, body: unknown): Promise<Product | null> {
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) return null;

  const payload = toProductPayload(body);
  const row = await prisma.product.update({
    where: { slug },
    data: {
      slug: payload.slug,
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      material: payload.material,
      image: payload.image,
      images: payload.images ?? [],
      collection: payload.collection,
      finish: payload.finish,
      stock: payload.stock,
      leadTimeDays: payload.leadTimeDays,
      tags: payload.tags,
      coatingOptions: toInputJson(payload.coatingOptions ?? []),
      isNew: payload.isNew ?? false,
      isLimited: payload.isLimited ?? false,
    },
  });

  return normalizeProduct({
    ...row,
    coatingOptions: fromJson(row.coatingOptions, []),
  });
}

export async function deleteProduct(slug: string): Promise<boolean> {
  try {
    await prisma.product.delete({ where: { slug } });
    return true;
  } catch {
    return false;
  }
}
