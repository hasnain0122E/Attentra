/**
 * Attentra — Minimal syntax highlighter for documentation code blocks.
 *
 * Deliberately small (no dependency): colours comments, strings, keywords
 * and numbers for python, javascript, bash, powershell and json. Output is
 * plain text tokens rendered as React text (never HTML).
 */

export type DocsLanguage = "python" | "javascript" | "bash" | "powershell" | "json" | "text";

export type TokenKind = "plain" | "comment" | "string" | "keyword" | "number" | "property";

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS: Record<DocsLanguage, string[]> = {
  python: [
    "import", "from", "as", "def", "return", "if", "elif", "else", "for", "while",
    "in", "not", "and", "or", "try", "except", "finally", "raise", "with", "class",
    "None", "True", "False", "break", "continue", "pass", "lambda", "print",
  ],
  javascript: [
    "import", "from", "export", "const", "let", "var", "function", "return", "if",
    "else", "for", "while", "await", "async", "new", "try", "catch", "finally",
    "throw", "class", "null", "undefined", "true", "false", "of", "in",
  ],
  bash: ["export", "curl", "pip", "npm", "python", "node", "echo", "set"],
  powershell: ["$env", "Read-Host", "Invoke-RestMethod", "ConvertTo-Json", "python", "pip"],
  json: ["true", "false", "null"],
  text: [],
};

const COMMENT: Record<DocsLanguage, RegExp | null> = {
  python: /#[^\n]*/y,
  javascript: /\/\/[^\n]*/y,
  bash: /#[^\n]*/y,
  powershell: /#[^\n]*/y,
  json: null,
  text: null,
};

const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/y;
const NUMBER = /\b\d+(?:\.\d+)?\b/y;
const WORD = /[A-Za-z_$][\w$-]*/y;

function matchAt(re: RegExp, source: string, index: number): string | null {
  re.lastIndex = index;
  const m = re.exec(source);
  return m && m.index === index ? m[0] : null;
}

/** Tokenize source code; concatenating token texts returns the input. */
export function highlight(code: string, language: DocsLanguage): Token[] {
  if (language === "text") return [{ text: code, kind: "plain" }];

  const keywords = new Set(KEYWORDS[language]);
  const tokens: Token[] = [];
  let plain = "";
  let i = 0;

  const flush = () => {
    if (plain) tokens.push({ text: plain, kind: "plain" });
    plain = "";
  };

  while (i < code.length) {
    const comment = COMMENT[language] ? matchAt(COMMENT[language]!, code, i) : null;
    if (comment) {
      flush();
      tokens.push({ text: comment, kind: "comment" });
      i += comment.length;
      continue;
    }

    const str = matchAt(STRING, code, i);
    if (str) {
      flush();
      // JSON object keys: a string followed by a colon
      const isKey = language === "json" && /^\s*:/.test(code.slice(i + str.length));
      tokens.push({ text: str, kind: isKey ? "property" : "string" });
      i += str.length;
      continue;
    }

    const prev = code[i - 1] ?? "";
    if (!/[\w$]/.test(prev)) {
      const num = matchAt(NUMBER, code, i);
      if (num) {
        flush();
        tokens.push({ text: num, kind: "number" });
        i += num.length;
        continue;
      }

      const word = matchAt(WORD, code, i);
      if (word) {
        if (keywords.has(word)) {
          flush();
          tokens.push({ text: word, kind: "keyword" });
        } else {
          plain += word;
        }
        i += word.length;
        continue;
      }
    }

    plain += code[i];
    i += 1;
  }

  flush();
  return tokens;
}
