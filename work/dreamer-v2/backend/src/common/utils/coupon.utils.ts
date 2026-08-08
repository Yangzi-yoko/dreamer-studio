export function computeCouponDeduct(coupon: { type: string; value: number }, amountCents: number): number {
  if (coupon.type === 'amount') {
    return Math.min(Math.max(0, coupon.value), amountCents);
  }
  // 折扣券 value 表示折数（如 9 = 9 折），减免 = 金额 * (10 - 折数) / 10
  const discount = Math.max(0, Math.min(coupon.value, 10));
  const deduct = Math.round((amountCents * (10 - discount)) / 10);
  return Math.max(0, Math.min(deduct, amountCents));
}
