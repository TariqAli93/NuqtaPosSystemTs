import { describe, expect, it } from 'vitest';
import { calculateSaleTotals, roundByCurrency } from '../utils/helpers.js';

describe('Money discipline', () => {
  it('keeps integer IQD amounts unchanged', () => {
    expect(roundByCurrency(12500, 'IQD')).toBe(12500);
  });

  it('rejects decimal IQD amounts', () => {
    expect(() => roundByCurrency(12500.5, 'IQD')).toThrow('IQD amounts must be integers');
  });

  it('calculates sale totals using integer amount tax', () => {
    const totals = calculateSaleTotals(
      [
        { quantity: 2, unitPrice: 1000, discount: 100 },
        { quantity: 1, unitPrice: 500, discount: 0 },
      ],
      50,
      200
    );

    expect(totals).toEqual({
      subtotal: 2300,
      discount: 50,
      tax: 200,
      total: 2450,
    });
  });

  it('rejects non-integer taxes', () => {
    expect(() =>
      calculateSaleTotals([{ quantity: 1, unitPrice: 1000, discount: 0 }], 0, 12.5)
    ).toThrow('Tax must be a non-negative integer amount');
  });
});

