/** Attentra — local docs search (static index, no external service). */

import { buildDocsSearchIndex, type DocsSearchEntry } from "./navigation";

const INDEX = buildDocsSearchIndex();

/** Rank entries: every query word must match; title matches rank higher. */
export function searchDocs(query: string, limit = 8): DocsSearchEntry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return INDEX.map((entry) => {
    if (!words.every((w) => entry.text.includes(w))) return null;
    const title = entry.title.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (title.startsWith(w)) score += 3;
      else if (title.includes(w)) score += 2;
      else score += 1;
    }
    // Prefer whole pages over their headings on ties.
    if (!entry.href.includes("#")) score += 0.5;
    return { entry, score };
  })
    .filter((r): r is { entry: DocsSearchEntry; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
