/**
 * Attentra — Markdown Table Parser
 *
 * Utilities for parsing markdown pricing tables from official
 * provider documentation pages.
 *
 * All three providers (OpenAI, Anthropic, Google) publish pricing
 * as markdown tables. This module extracts structured data from them.
 */

/**
 * A single parsed markdown table.
 */
export interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parse all markdown tables from a text document.
 *
 * Detects table blocks (lines starting with `|`), skips separator
 * lines (`| --- | --- |`), and returns structured header + row data.
 */
export function parseMarkdownTables(content: string): MarkdownTable[] {
  const lines = content.split("\n");
  const tables: MarkdownTable[] = [];
  let currentHeaders: string[] | null = null;
  let currentRows: string[][] = [];
  let inTable = false;
  let headerParsed = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines and non-table lines
    if (!line.startsWith("|")) {
      // End of table block
      if (inTable && currentHeaders) {
        tables.push({ headers: currentHeaders, rows: currentRows });
      }
      currentHeaders = null;
      currentRows = [];
      inTable = false;
      headerParsed = false;
      continue;
    }

    // Skip separator lines: | --- | --- |
    if (/^\|[\s\-:]+\|$/.test(line) || /^\|(\s*-+\s*\|)+/.test(line)) {
      headerParsed = true;
      continue;
    }

    // Parse cells
    const cells = line
      .split("|")
      .slice(1, -1) // remove first and last empty from split
      .map((c) => c.trim());

    if (!headerParsed) {
      currentHeaders = cells;
      inTable = true;
    } else {
      currentRows.push(cells);
    }
  }

  // Handle table at end of document
  if (inTable && currentHeaders) {
    tables.push({ headers: currentHeaders, rows: currentRows });
  }

  return tables;
}

/**
 * Extract a dollar amount from a string cell.
 * Handles formats like "$2.50", "$0.15", "$10 / MTok", "$2.50, prompts <= 200k".
 * Returns null if no dollar value found.
 */
export function extractDollarAmount(cell: string): number | null {
  if (!cell || cell === "-" || cell.toLowerCase().includes("not available")) {
    return null;
  }

  // Match the first dollar amount: $X.XX or $X
  const match = cell.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;

  return parseFloat(match[1]);
}

/**
 * Convert price per 1M tokens to price per 1K tokens.
 */
export function per1MtoPer1K(pricePer1M: number): number {
  return pricePer1M / 1000;
}

/**
 * Find the first table that contains a header matching a keyword.
 */
export function findTableByHeader(tables: MarkdownTable[], keyword: string): MarkdownTable | null {
  for (const table of tables) {
    if (table.headers.some((h) => h.toLowerCase().includes(keyword.toLowerCase()))) {
      return table;
    }
  }
  return null;
}

/**
 * Find a row in a table where the first column matches a search string.
 * Uses case-insensitive partial matching.
 */
export function findRowByFirstCell(table: MarkdownTable, search: string): string[] | null {
  const normalized = search.toLowerCase();
  for (const row of table.rows) {
    if (row[0]?.toLowerCase().includes(normalized)) {
      return row;
    }
  }
  return null;
}

/**
 * Find an exact row match where first cell equals the search string.
 */
export function findRowByExactFirstCell(table: MarkdownTable, search: string): string[] | null {
  const normalized = search.toLowerCase().trim();
  for (const row of table.rows) {
    if (row[0]?.toLowerCase().trim() === normalized) {
      return row;
    }
  }
  return null;
}
