import { describe, expect, it } from 'vitest';
import { convertFromAed, convertToAed, formatAed, formatMoney } from '../src';

const rates = { INR: 22.9, USD: 0.2723 };

describe('currency', () => {
  it('converts from AED', () => {
    expect(convertFromAed(100, 'INR', rates)).toBeCloseTo(2290);
    expect(convertFromAed(100, 'AED', rates)).toBe(100);
  });
  it('returns null when the rate is missing', () => {
    expect(convertFromAed(100, 'XYZ', rates)).toBeNull();
    expect(convertFromAed(100, 'INR', null)).toBeNull();
  });
  it('converts back to AED', () => {
    expect(convertToAed(2290, 'INR', rates)).toBeCloseTo(100);
  });
  it('formats amounts', () => {
    expect(formatAed(120)).toBe('AED 120');
    expect(formatAed(7.5)).toBe('AED 7.50');
    expect(formatMoney(229000, 'INR')).toBe('₹2,29,000');
  });
});
