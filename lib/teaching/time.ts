export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function differenceInCalendarDays(left: Date, right: Date): number {
  const leftUtc = Date.UTC(left.getUTCFullYear(), left.getUTCMonth(), left.getUTCDate());
  const rightUtc = Date.UTC(right.getUTCFullYear(), right.getUTCMonth(), right.getUTCDate());
  return Math.round((leftUtc - rightUtc) / 86_400_000);
}
