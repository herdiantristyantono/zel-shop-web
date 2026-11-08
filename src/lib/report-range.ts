import { startOfDayWIB, ymdWIB } from "./admin-stats";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Rentang laporan dari query (?dari=YYYY-MM-DD&sampai=YYYY-MM-DD), inklusif, default 30 hari terakhir, maks. 366 hari. */
export function parseRange(sp: Record<string, string | string[] | undefined>) {
  const today = ymdWIB(new Date());
  let to = typeof sp.sampai === "string" && ISO.test(sp.sampai) ? sp.sampai : today;
  let from = typeof sp.dari === "string" && ISO.test(sp.dari) ? sp.dari : ymdWIB(startOfDayWIB(new Date(), -29));
  if (from > to) [from, to] = [to, from];
  const start = new Date(`${from}T00:00:00+07:00`);
  let end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86_400_000);
  if (end.getTime() - start.getTime() > 366 * 86_400_000) {
    end = new Date(start.getTime() + 366 * 86_400_000);
    to = ymdWIB(new Date(end.getTime() - 1));
  }
  return { from, to, start, end, days: Math.round((end.getTime() - start.getTime()) / 86_400_000) };
}
