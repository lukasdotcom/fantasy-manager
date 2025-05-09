/**
 *
 * @param a the first version.
 * @param b the second version.
 * @returns -1 if b is newer than a, 1 if a is newer than b, 0 if they are the same.
 */
export function compareSemanticVersions(a: string, b: string): 1 | -1 | 0 {
  // 1. Split the strings into their parts.
  const a1 = a.split(".");
  const b1 = b.split(".");
  const len = Math.min(a1.length, b1.length); // Look through each part of the version number and compare.
  for (let i = 0; i < len; i++) {
    const a2 = +a1[i] || 0;
    const b2 = +b1[i] || 0;
    if (a2 !== b2) {
      // Returns if they are different
      return a2 < b2 ? 1 : -1;
    }
  }
  if (a1.length === b1.length) {
    return 0;
  }
  // We hit this if the all checked versions so far are equal
  return a1.length - b1.length > 0 ? 1 : -1;
}
