// ═══════════════════════════════════════════════════════════════
//  CHROMAVORE — SHARED SCORE FORMATTER (COMPACT K / M)
// ═══════════════════════════════════════════════════════════════

/**
 * Formats score numbers compactly using K (thousands) and M (millions).
 * Rules:
 *  - Below 1,000: exact integer (e.g. 950)
 *  - 1,000 to 999,499: 1.2K, 12.5K, 450K (never '1000K')
 *  - 999,500 and above: 1M, 2.45M, 12.5M
 *  - Trims unnecessary trailing decimal zeros (e.g. 1.0M -> 1M)
 */
export function formatScoreCompact(score: number): string {
  if (!Number.isFinite(score)) return '0';
  const sign = score < 0 ? '-' : '';
  const abs = Math.abs(score);

  if (abs < 1000) {
    return `${sign}${Math.round(abs)}`;
  }

  // Under 999,500 -> K format (avoids rounding up to 1000K)
  if (abs < 999_500) {
    const kVal = abs / 1000;
    let formatted: string;
    if (kVal >= 100) {
      formatted = Math.round(kVal).toString();
    } else {
      formatted = kVal.toFixed(1).replace(/\.0$/, '');
    }
    return `${sign}${formatted}K`;
  }

  // 999,500 and up -> M format
  const mVal = abs / 1_000_000;
  let formatted: string;
  if (mVal >= 10) {
    formatted = mVal.toFixed(1).replace(/\.0$/, '');
  } else {
    formatted = mVal.toFixed(2).replace(/(\.[0-9]*[1-9])0+$|\.0+$/, '$1');
  }
  return `${sign}${formatted}M`;
}
