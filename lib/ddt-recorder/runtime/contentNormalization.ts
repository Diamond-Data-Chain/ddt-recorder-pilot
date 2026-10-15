export const DDT_CONTENT_NORMALIZATION_PROFILE = {
  profileId: "DDT-CONTENT-NORMALIZATION",
  version: "0.1.0-draft.1",
  unicodeForm: "NFC",
  outputEncoding: "UTF-8",
  digestAlgorithm: "SHA-256",
} as const;

export function normalizeDDTContent(
  input: string
): string {
  return input
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\v\f\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}
