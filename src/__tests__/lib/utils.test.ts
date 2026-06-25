import { describe, it, expect } from 'vitest';
import { cn, formatRupiah } from '@/lib/utils';

describe('cn (classname merge utility)', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('merges array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });
});

describe('formatRupiah', () => {
  it('formats zero correctly', () => {
    const result = formatRupiah(0);
    expect(result).toContain('0');
    expect(result).toContain('Rp');
  });

  it('formats positive integers', () => {
    const result = formatRupiah(10000);
    expect(result).toContain('Rp');
    expect(result).toContain('10.000');
  });

  it('formats large numbers with thousand separators', () => {
    const result = formatRupiah(1500000);
    expect(result).toContain('1.500.000');
  });

  it('formats without decimal fraction digits', () => {
    const result = formatRupiah(25000);
    // Should not contain comma for decimals (minimumFractionDigits: 0)
    expect(result).not.toMatch(/,\d{2}$/);
  });

  it('formats negative numbers', () => {
    const result = formatRupiah(-5000);
    expect(result).toContain('5.000');
    expect(result).toMatch(/-/);
  });
});
