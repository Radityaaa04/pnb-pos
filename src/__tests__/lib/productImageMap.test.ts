import { describe, it, expect } from 'vitest';
import { PRODUCT_IMAGE_MAP } from '@/lib/productImageMap';

describe('PRODUCT_IMAGE_MAP', () => {
  it('is a non-empty record', () => {
    expect(Object.keys(PRODUCT_IMAGE_MAP).length).toBeGreaterThan(0);
  });

  it('maps known products to image paths', () => {
    expect(PRODUCT_IMAGE_MAP['Kopi Susu Aren']).toBe('/products/kopi_susu_aren.png');
    expect(PRODUCT_IMAGE_MAP['Americano']).toBe('/products/americano.png');
    expect(PRODUCT_IMAGE_MAP['Matcha Latte']).toBe('/products/matcha_latte.png');
  });

  it('all values are valid image paths starting with /products/', () => {
    Object.values(PRODUCT_IMAGE_MAP).forEach((path) => {
      expect(path).toMatch(/^\/products\/[\w]+\.png$/);
    });
  });

  it('returns undefined for unknown products', () => {
    expect(PRODUCT_IMAGE_MAP['Unknown Product']).toBeUndefined();
  });

  it('contains expected number of products', () => {
    expect(Object.keys(PRODUCT_IMAGE_MAP)).toHaveLength(7);
  });
});
