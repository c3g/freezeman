const WORD_CASES: Record<string, [string, string]> = {
  sample: ["potato", "potatoes"],
  Sample: ["Potato", "Potatoes"],
  SAMPLE: ["POTATO", "POTATOES"],
}

/** Joke-theme display helper: replace sample/Freezeman wording in labels that come from the backend. */
export function potatoify(text: string | undefined | null): string {
  if (!text) return ""
  return text
    .replace(/\b(sample)(s?)\b/gi, (match, word: string, plural: string) => {
      const forms = WORD_CASES[word] ?? (word === word.toUpperCase() ? WORD_CASES.SAMPLE : WORD_CASES.sample)
      return forms[plural ? 1 : 0]
    })
    .replace(/\bfreezeman\b/gi, "PotatoMan")
}
