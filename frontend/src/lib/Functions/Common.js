import { differenceInMinutes, format } from "date-fns";

export const humanize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

export const fullName = (person) =>
  person ? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() : "";

export const plural = (count, word) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

export const formatDateTime = (value) =>
  value ? format(new Date(value), "dd MMM yyyy, hh:mm a") : null;

export const formatDate = (value) =>
  value ? format(new Date(value), "dd MMM yyyy") : null;

export const formatTime = (value) =>
  value ? format(new Date(value), "hh:mm a") : null;

export const minutesBetween = (start, end) =>
  Math.max(
    differenceInMinutes(end ? new Date(end) : new Date(), new Date(start)),
    0,
  );

export const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

export const formatDuration = (start, end) =>
  formatMinutes(minutesBetween(start, end));

export const formatMoney = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export const formatAmount = (value) =>
  Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const toPriceInput = (value) =>
  value === null || value === undefined ? "" : String(Number(value));

export const nameOption = (row) =>
  row?.id ? { label: row.name, value: row.id } : null;

export const outletOption = (row) =>
  row?.id
    ? {
        label: row.parent?.name ? `${row.name} (${row.parent.name})` : row.name,
        value: row.id,
      }
    : null;

export const staffOption = (row) =>
  row?.id ? { label: fullName(row), value: row.id } : null;

export const roleLabel = (account) => account?.role?.name ?? null;
