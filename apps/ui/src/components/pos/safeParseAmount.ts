export function safeParseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || !Number.isInteger(input)) {
      return 0;
    }
    return Math.max(0, input);
  }

  if (typeof input !== 'string') {
    return 0;
  }

  const normalized = input.replace(/,/g, '').trim();

  if (!normalized || normalized === '.') {
    return 0;
  }

  if (normalized.includes('.')) {
    return 0;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return 0;
  }

  return Math.max(0, parsed);
}
