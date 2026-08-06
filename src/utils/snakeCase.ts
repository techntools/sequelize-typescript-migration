export const snakeCase = (camelCase: string): string => {
  return camelCase
    // split words by all capital and capital followed by lower letters
    .replace(/([A-Z]+)([A-Z][a-z]+)/g, "$1_$2")
    // split words by capital letters
    .replace(/([A-Z]+)/g, (match) => `_${match.toLowerCase()}`)
    // split multi-digit numbers
    .replace(/(\d+)/g, (match) => `_${match}`)
    // replace runs of punctuation and whitespace with a single underscore
    .replace(/[\s._-]+/g, "_")
    // rm leading/trailing underscores
    .replace(/^_+/g, "")
    .replace(/_+$/g, "");
};
