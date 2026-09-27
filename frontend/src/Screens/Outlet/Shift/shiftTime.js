import { minutesBetween } from "@/lib/Functions/Common";

export const openBreakOf = (shift) =>
  shift?.breaks?.find((item) => !item.endAt) ?? null;

export const breakMinutes = (shift) =>
  (shift?.breaks ?? []).reduce(
    (sum, item) => sum + minutesBetween(item.startAt, item.endAt),
    0,
  );

export const workedMinutes = (shift) =>
  Math.max(
    minutesBetween(shift.clockInAt, shift.clockOutAt) - breakMinutes(shift),
    0,
  );
