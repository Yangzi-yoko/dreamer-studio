import { toCents, toYuan } from './money.utils';

describe('money.utils', () => {
  it('converts yuan to cents exactly', () => {
    expect(toCents(199.99)).toBe(19999);
    expect(toCents(0.1)).toBe(10);
  });
  it('converts cents to yuan', () => {
    expect(toYuan(19999)).toBe(199.99);
  });
});
