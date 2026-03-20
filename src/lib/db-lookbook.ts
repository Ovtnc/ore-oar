import { getMongoClient } from "@/lib/mongodb";

const LOOKBOOK_DOC_ID = "homepage-lookbook";
const LOOKBOOK_LIMIT = 8;

type LookbookDoc = {
  _id: string;
  slugs: string[];
  updatedAt?: string;
};

function normalizeSlugs(input: unknown) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  ).slice(0, LOOKBOOK_LIMIT);
}

async function safeGetSettingsCollection() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB ?? "oar-ore").collection<LookbookDoc>("settings");
}

export async function fetchLookbookSlugs(): Promise<string[]> {
  try {
    const collection = await safeGetSettingsCollection();
    const doc = await collection.findOne({ _id: LOOKBOOK_DOC_ID });
    if (!doc) return [];
    return normalizeSlugs(doc.slugs);
  } catch {
    return [];
  }
}

export async function saveLookbookSlugs(input: unknown): Promise<string[]> {
  const slugs = normalizeSlugs(input);
  const collection = await safeGetSettingsCollection();
  await collection.updateOne(
    { _id: LOOKBOOK_DOC_ID },
    {
      $set: {
        slugs,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  return slugs;
}

