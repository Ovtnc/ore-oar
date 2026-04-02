import { readSetting, writeSetting } from "@/lib/db-settings";

const LOOKBOOK_DOC_ID = "homepage-lookbook";
const LOOKBOOK_LIMIT = 8;

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

export async function fetchLookbookSlugs(): Promise<string[]> {
  try {
    const value = await readSetting<string[]>(LOOKBOOK_DOC_ID, []);
    return normalizeSlugs(value);
  } catch {
    return [];
  }
}

export async function saveLookbookSlugs(input: unknown): Promise<string[]> {
  const slugs = normalizeSlugs(input);
  await writeSetting(LOOKBOOK_DOC_ID, slugs);
  return slugs;
}
