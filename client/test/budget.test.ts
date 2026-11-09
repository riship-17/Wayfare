import { describe, expect, it } from 'vitest';
import type { ApiCostItem, ApiListing } from '@wayfare/shared';
import { amountFor, totals } from '../src/features/budget/Budget';

const cost = (key: string, timing: ApiCostItem['timing'], amountAed: number | null, fromListing: ApiCostItem['fromListing'] = null): ApiCostItem => ({
  key, label: key, timing, amountAed, amountNote: null, needsEmiratesId: false, fromListing, source: null,
});
const costs = [cost('rent', 'monthly', null, 'rent'), cost('deposit', 'before', null, 'deposit'), cost('ejari', 'first_month', 120), cost('metro-trip', 'first_month', 3), cost('groceries', 'monthly', null)];
const listing = {
  verification: { status: 'verified' },
  roomTypes: [{ type: 'shared', priceAedMonthly: 3250, depositAed: 1500 }, { type: 'private', priceAedMonthly: 4100, depositAed: 2000 }],
} as unknown as ApiListing;

describe('budget', () => {
  it('takes rent and deposit from the chosen verified place', () => {
    expect(amountFor(costs[0], new Map(), listing)).toBe(3250);
    expect(amountFor(costs[1], new Map(), listing)).toBe(1500);
  });
  it('never guesses rent without a verified place', () => {
    expect(amountFor(costs[0], new Map(), null)).toBeNull();
    expect(amountFor(costs[0], new Map(), { ...listing, verification: { status: 'pending' } } as ApiListing)).toBeNull();
  });
  it('prefers the number the student typed', () => {
    expect(amountFor(costs[0], new Map([['rent', 2900]]), listing)).toBe(2900);
  });
  it('adds up totals and leaves the per trip fare out', () => {
    const t = totals(costs, new Map([['groceries', 600]]), listing);
    expect(t.first).toBe(3250 + 1500 + 120 + 600);
    expect(t.monthly).toBe(3250 + 600);
  });
});
