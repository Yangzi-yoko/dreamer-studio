export function computeCouponDeduct(coupon: { type: string; value: number }, amountCents: number): number {
  if (coupon.type === 'amount') {
    return Math.min(Math.max(0, coupon.value), amountCents);
  }
  // 折扣券 value 表示应付百分比（如 90 = 9 折，付 90%），减免 = 金额 * (100 - value) / 100
  const discount = Math.max(0, Math.min(coupon.value, 100));
  const deduct = Math.round((amountCents * (100 - discount)) / 100);
  return Math.max(0, Math.min(deduct, amountCents));
}
