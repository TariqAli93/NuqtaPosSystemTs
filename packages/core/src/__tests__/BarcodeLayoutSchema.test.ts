import { describe, expect, it } from 'vitest';
import { normalizeBarcodeLayoutJson } from '../entities/Barcode.js';

describe('normalizeBarcodeLayoutJson', () => {
  it('upgrades legacy layout payloads to version 1', () => {
    const layoutJson = JSON.stringify({
      elements: [
        { id: 'a', type: 'productName', x: 1, y: 2, fontSize: 8 },
        { id: 'b', type: 'barcode', x: 2, y: 4, width: 20, height: 10 },
      ],
    });

    const normalized = normalizeBarcodeLayoutJson(layoutJson);
    expect(normalized).not.toBeNull();

    const parsed = JSON.parse(normalized || '{}');
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.elements)).toBe(true);
    expect(parsed.elements).toHaveLength(2);
  });

  it('keeps valid versioned payloads', () => {
    const layoutJson = JSON.stringify({
      version: 1,
      elements: [{ id: 'a', type: 'price', x: 0, y: 0, fontSize: 9 }],
    });
    const normalized = normalizeBarcodeLayoutJson(layoutJson);
    expect(JSON.parse(normalized || '{}')).toEqual({
      version: 1,
      elements: [{ id: 'a', type: 'price', x: 0, y: 0, fontSize: 9 }],
    });
  });

  it('rejects invalid layout schema', () => {
    const invalid = JSON.stringify({
      version: 1,
      elements: [{ id: 'broken', type: 'barcode', x: 0, y: 0 }],
    });
    expect(() => normalizeBarcodeLayoutJson(invalid)).toThrow(
      'layoutJson does not match supported barcode layout schema'
    );
  });
});

