export function safeParseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.max(0, Math.round(input)) : 0;
  }

  if (typeof input !== 'string') {
    return 0;
  }

  const normalized = input.replace(/,/g, '').trim();

  if (!normalized || normalized === '.') {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
}
