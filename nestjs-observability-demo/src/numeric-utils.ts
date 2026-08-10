export function boundedDecimal(
  value: unknown,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, maximum);
}

export function boundedInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number {
  return Math.round(boundedDecimal(value, fallback, maximum));
}
