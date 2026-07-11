const BLOCKED_TERMS = [
  "clone",
  "réplica",
  "replica",
  "inspirado",
  "inspirada",
  "inspirados",
  "inspiradas",
  "contratipo",
  "dupe",
  "imitação",
  "imitacao",
  "cheira como",
  "cheira igual",
];

/** Google Ads suspende contas por violar a política de Counterfeit Goods quando o
 * texto do produto sugere que ele imita/clona a fragrância de outra marca. */
export function findBlockedTerm(text: string): string | null {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.find((term) => lower.includes(term)) ?? null;
}

export function checkProductContentPolicy(fields: {
  name?: string;
  brand?: string;
  description?: string;
}): string | null {
  for (const value of Object.values(fields)) {
    if (!value) continue;
    const term = findBlockedTerm(String(value));
    if (term) {
      return `O texto contém o termo "${term}", que viola a política de Conteúdo de Produtos Falsificados do Google Ads. Remova essa referência antes de salvar.`;
    }
  }
  return null;
}
