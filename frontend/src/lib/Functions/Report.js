import { format } from "date-fns";
import { formatMinutes, formatMoney } from "./Common";

export const REPORT_TYPES = [
  { value: "sales", label: "Sales", dated: true },
  { value: "items", label: "Item Sales", dated: true },
  { value: "servers", label: "Servers", dated: true, staff: true },
  { value: "shifts", label: "Staff Shifts", dated: true, staff: true },
  { value: "attendance", label: "Attendance", dated: true, staff: true },
  { value: "stock", label: "Stock", dated: false },
];

const toDay = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const LEVEL_TONES = {
  "In stock": "good",
  Low: "warning",
  Critical: "serious",
  "Out of stock": "critical",
};

export const formatDay = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))
    ? format(toDay(value), "dd MMM yyyy")
    : String(value ?? "");

const FORMATTERS = {
  money: (value) => formatMoney(value),
  number: (value) => Number(value).toLocaleString("en-US"),
  percent: (value) => `${value}%`,
  minutes: (value) => formatMinutes(value),
  date: (value) => formatDay(value),
  time: (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : format(date, "hh:mm a");
  },
};

export const formatReportValue = (value, type) => {
  if (value === "" || value === null || value === undefined) return "";
  const formatter = FORMATTERS[type];
  return formatter ? formatter(value) : String(value);
};

const csvValue = (value, type) => {
  if (type === "money" && value !== "") return Number(value).toFixed(2);
  if (type === "number" && value !== "") return String(value);
  return formatReportValue(value, type);
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const reportPeriod = (report) =>
  report.period
    ? `${formatDay(report.period.from)} – ${formatDay(report.period.to)}`
    : `As of ${format(new Date(report.generatedAt), "dd MMM yyyy, hh:mm a")}`;

export const staffLabel = (staff) => `${staff.name} (${staff.badgeNumber})`;

export function reportCsv(report) {
  const lines = [
    [report.title],
    ["Outlet", report.outlet.name],
    ["Company", report.outlet.parent?.name ?? ""],
    ["Period", reportPeriod(report)],
    ...(report.staff ? [["Staff", staffLabel(report.staff)]] : []),
    ["Generated", format(new Date(report.generatedAt), "dd MMM yyyy, hh:mm a")],
    [],
    ...report.summary.map((item) => [
      item.label,
      csvValue(item.value, item.type),
    ]),
    [],
    report.columns.map((column) => column.title),
    ...report.rows.map((row) =>
      report.columns.map((column) => csvValue(row[column.key], column.type)),
    ),
    report.columns.map((column) =>
      csvValue(report.totals?.[column.key] ?? "", column.type),
    ),
  ];
  return lines.map((line) => line.map(csvCell).join(",")).join("\n");
}

export const slug = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const reportFileName = (report, extension) => {
  const range = report.period
    ? `${report.period.from}_${report.period.to}`
    : format(new Date(), "yyyy-MM-dd");
  return `${slug(report.outlet.name)}-${slug(report.title)}-${range}.${extension}`;
};

export function saveFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadReport(report) {
  const blob = new Blob(["\uFEFF" + reportCsv(report)], {
    type: "text/csv;charset=utf-8",
  });
  saveFile(blob, reportFileName(report, "csv"));
}
