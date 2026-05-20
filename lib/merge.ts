// 3-way line merge (diff3) for resolving note conflicts.

export interface Diff3Result {
  /** true when ours and theirs touched disjoint regions — `merged` is safe to use */
  clean: boolean;
  /** the auto-merged document; meaningful only when `clean` is true */
  merged: string;
  /** full document with every conflict resolved in favour of our side */
  oursResolved: string;
  /** full document with every conflict resolved in favour of their side */
  theirsResolved: string;
  /** number of overlapping (conflicting) regions */
  conflictCount: number;
}

type Region =
  | { type: "stable"; lines: string[] }
  | { type: "conflict"; ours: string[]; theirs: string[] };

function splitLines(text: string): string[] {
  return text.split("\n");
}

function sameLines(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Longest common subsequence of two line arrays.
 * Returns matched index pairs [indexInA, indexInB] in increasing order.
 */
function lcsMatches(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = LCS length of a[i:] and b[j:]
  const dp: Int32Array[] = [];
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    const row = dp[i];
    const next = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      row[j] =
        a[i] === b[j] ? next[j + 1] + 1 : Math.max(next[j], row[j + 1]);
    }
  }
  const matches: Array<[number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      matches.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return matches;
}

export function diff3Merge(
  base: string,
  ours: string,
  theirs: string,
): Diff3Result {
  const baseL = splitLines(base);
  const oursL = splitLines(ours);
  const theirsL = splitLines(theirs);

  // guard: an in-memory LCS over very large files is too costly — degrade
  // gracefully to a single whole-file conflict (or a clean no-op)
  const LIMIT = 2_000_000;
  if (
    baseL.length * oursL.length > LIMIT ||
    baseL.length * theirsL.length > LIMIT
  ) {
    return {
      clean: ours === theirs,
      merged: ours,
      oursResolved: ours,
      theirsResolved: theirs,
      conflictCount: ours === theirs ? 0 : 1,
    };
  }

  // base lines that survive unchanged into BOTH sides act as sync points
  const oursMatch = new Map<number, number>();
  for (const [b, x] of lcsMatches(baseL, oursL)) oursMatch.set(b, x);
  const theirsMatch = new Map<number, number>();
  for (const [b, x] of lcsMatches(baseL, theirsL)) theirsMatch.set(b, x);

  const regions: Region[] = [];
  let prevB = -1;
  let prevO = -1;
  let prevT = -1;

  const handleGap = (curB: number, curO: number, curT: number) => {
    const baseSeg = baseL.slice(prevB + 1, curB);
    const oursSeg = oursL.slice(prevO + 1, curO);
    const theirsSeg = theirsL.slice(prevT + 1, curT);

    const oursChanged = !sameLines(oursSeg, baseSeg);
    const theirsChanged = !sameLines(theirsSeg, baseSeg);

    if (!oursChanged && !theirsChanged) {
      if (baseSeg.length) regions.push({ type: "stable", lines: baseSeg });
    } else if (oursChanged && !theirsChanged) {
      if (oursSeg.length) regions.push({ type: "stable", lines: oursSeg });
    } else if (!oursChanged && theirsChanged) {
      if (theirsSeg.length) regions.push({ type: "stable", lines: theirsSeg });
    } else if (sameLines(oursSeg, theirsSeg)) {
      if (oursSeg.length) regions.push({ type: "stable", lines: oursSeg });
    } else {
      regions.push({ type: "conflict", ours: oursSeg, theirs: theirsSeg });
    }
  };

  for (let b = 0; b < baseL.length; b++) {
    if (oursMatch.has(b) && theirsMatch.has(b)) {
      const curO = oursMatch.get(b)!;
      const curT = theirsMatch.get(b)!;
      handleGap(b, curO, curT);
      regions.push({ type: "stable", lines: [baseL[b]] });
      prevB = b;
      prevO = curO;
      prevT = curT;
    }
  }
  // trailing gap after the last sync point
  handleGap(baseL.length, oursL.length, theirsL.length);

  let conflictCount = 0;
  const mergedParts: string[] = [];
  const oursParts: string[] = [];
  const theirsParts: string[] = [];

  for (const r of regions) {
    if (r.type === "stable") {
      mergedParts.push(...r.lines);
      oursParts.push(...r.lines);
      theirsParts.push(...r.lines);
    } else {
      conflictCount++;
      oursParts.push(...r.ours);
      theirsParts.push(...r.theirs);
      mergedParts.push(...r.ours); // only meaningful when clean
    }
  }

  return {
    clean: conflictCount === 0,
    merged: mergedParts.join("\n"),
    oursResolved: oursParts.join("\n"),
    theirsResolved: theirsParts.join("\n"),
    conflictCount,
  };
}