// Date helpers for sample data. The prototype's "today" was 16 Oct 2026 (it shows
// Dr. Ananya Rao "LAST CHECKED 12 OCT 2026" and "CHECKED 4 DAYS AGO" together), so relative
// numbers in the prototype ("days: 4", "3 days ago") are converted from that day.

import { addDays, istDay, parseIst } from "../../src/lib/dates";
import { SAMPLE_REFERENCE_DATE } from "../../src/lib/domain";

export const REFERENCE = parseIst(`${SAMPLE_REFERENCE_DATE} 11:00`);

/** "YYYY-MM-DD" n days before the prototype's today. */
export function daysBefore(n: number): string {
  return istDay(addDays(REFERENCE, -n));
}

/** "YYYY-MM-DD HH:mm" n minutes before the prototype's "now" (16 Oct 2026, 11:00 IST). */
export function minutesBefore(n: number): string {
  const d = new Date(REFERENCE.getTime() - n * 60_000);
  const day = istDay(d);
  const t = new Date(d.getTime() + 330 * 60_000);
  return `${day} ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

export const hoursBefore = (n: number) => minutesBefore(n * 60);

export function d(value: string): Date {
  return parseIst(value);
}

export function optionalDate(value: string | null | undefined): Date | null {
  return value ? parseIst(value) : null;
}
