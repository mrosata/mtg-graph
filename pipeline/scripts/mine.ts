export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

export function ngrams(text: string, n: number, stopwords: Set<string>): string[] {
  const toks = tokenize(text);
  const out: string[] = [];
  for (let i = 0; i + n <= toks.length; i++) {
    const window = toks.slice(i, i + n);
    if (stopwords.has(window[0]!) || stopwords.has(window[n - 1]!)) continue;
    out.push(window.join(' '));
  }
  return out;
}

export function topNgrams(
  texts: string[],
  n: number,
  stopwords: Set<string>,
  minFreq: number,
): Array<{ ngram: string; count: number }> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const g of ngrams(text, n, stopwords)) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= minFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([ngram, count]) => ({ ngram, count }));
}
