import { ObjectId } from "mongodb";
import { getMongoClient } from "@/lib/mongodb";
import { toSafePrice } from "@/lib/price";
import { products as fallbackProducts } from "@/lib/products";
import { Product, ProductCategory, ProductCoatingOption } from "@/lib/types";

type ProductDoc = Product & {
  _id?: ObjectId;
  createdAt?: string;
  updatedAt?: string;
};

function parseStock(input: unknown) {
  const numeric = Number(input ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
}

function parseImageList(input: unknown, fallback?: unknown): string[] {
  const rawList: string[] = [];

  const addToken = (value: string) => {
    const cleaned = value
      .trim()
      .replace(/^["'\[\]]+/, "")
      .replace(/["'\[\]]+$/, "");
    if (cleaned) rawList.push(cleaned);
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
          const parsed = JSON.parse(trimmed) as unknown;
          collect(parsed);
          return;
        } catch {
          // JSON parse edilemezse normal ayırma akışına düş.
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

function normalizeProduct(doc: Partial<ProductDoc>): Product {
  const images = parseImageList(doc.images, doc.image);
  const primaryImage = images[0] ?? "/products/aether.jpg";

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
    coatingOptions: parseCoatingOptions(doc.coatingOptions),
    isNew: Boolean(doc.isNew),
    isLimited: Boolean(doc.isLimited),
  };
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

function parseCategory(input: string): ProductCategory {
  const normalized = input.trim();
  const allowed: ProductCategory[] = ["Kolye", "Bileklik", "Pin", "Küpe", "Anahtarlık"];
  if (!allowed.includes(normalized as ProductCategory)) {
    // Fallback to first category.
    return "Kolye";
  }
  return normalized as ProductCategory;
}

function toProductPayload(body: unknown): Omit<ProductDoc, "createdAt" | "updatedAt"> {
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

  return {
    id: slug,
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
    coatingOptions: parseCoatingOptions(b?.coatingOptions),
    isNew,
    isLimited,
  };
}

async function safeGetCollection() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB ?? "oar-ore").collection<ProductDoc>("products");
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const collection = await safeGetCollection();
    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    // DB erişimi başarılı ama ürün yoksa boş liste dön.
    if (!docs.length) return [];
    return docs.map((doc) => normalizeProduct({ ...doc, _id: doc._id }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("placeholder")) return [];
    return fallbackProducts.map((product) => normalizeProduct(product));
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    const collection = await safeGetCollection();
    const doc = await collection.findOne({ slug });
    if (!doc) return null;
    return normalizeProduct(doc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("placeholder")) return null;
    const fallback = fallbackProducts.find((p) => p.slug === slug);
    return fallback ? normalizeProduct(fallback) : null;
  }
}

export async function createProduct(body: unknown): Promise<Product> {
  const payload = toProductPayload(body);

  const collection = await safeGetCollection();
  const now = new Date().toISOString();

  const doc: ProductDoc = {
    ...payload,
    createdAt: now,
    updatedAt: now,
  };

  await collection.updateOne({ slug: doc.slug }, { $set: doc }, { upsert: true });
  return normalizeProduct(doc);
}

export async function updateProduct(slug: string, body: unknown): Promise<Product | null> {
  const payload = toProductPayload(body);
  const now = new Date().toISOString();

  const collection = await safeGetCollection();
  await collection.updateOne({ slug }, { $set: { ...payload, updatedAt: now } });

  // Slug değişebilir; güncel kaydı payload.slug ile buluyoruz.
  const updated = await collection.findOne({ slug: payload.slug });
  if (!updated) return null;
  return normalizeProduct(updated);
}

export async function deleteProduct(slug: string): Promise<boolean> {
  const collection = await safeGetCollection();
  const result = await collection.deleteOne({ slug });
  return result.deletedCount > 0;
}
