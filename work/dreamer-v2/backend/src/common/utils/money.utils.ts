export function toCents(yuan: number): number {
  return Math.round(yuan * 100);
}

export function toYuan(cents: number): number {
  return Math.round(cents) / 100;
}
