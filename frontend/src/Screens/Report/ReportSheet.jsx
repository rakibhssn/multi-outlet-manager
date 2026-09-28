import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  LEVEL_TONES,
  formatReportValue,
  reportPeriod,
  staffLabel,
} from "@/lib/Functions/Report";

const ALIGN_RIGHT = ["money", "number", "percent", "minutes"];

const cellClass = (column) =>
  cn("report-cell", ALIGN_RIGHT.includes(column.type) && "report-cell-right");

function ReportValue({ value, type }) {
  const text = formatReportValue(value, type);
  if (type !== "level" || !text) return text;
  return (
    <span
      className={cn(
        "report-level",
        `report-level-${LEVEL_TONES[text] ?? "good"}`,
      )}
    >
      {text}
    </span>
  );
}

export default function ReportSheet({ report }) {
  const { outlet } = report;
  const address = [
    outlet.address,
    outlet.city,
    outlet.state,
    outlet.zipCode,
    outlet.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="report-sheet">
      <header className="report-head">
        <div className="report-head-outlet">
          {outlet.parent?.name && (
            <span className="report-brand">{outlet.parent.name}</span>
          )}
          <span className="report-outlet">{outlet.name}</span>
          {address && <span className="report-muted">{address}</span>}
          {outlet.contactPersonPhone && (
            <span className="report-muted">
              Tel: {outlet.contactPersonPhone}
            </span>
          )}
        </div>
        <div className="report-head-meta">
          <h2 className="report-title">{report.title}</h2>
          <span className="report-period">{reportPeriod(report)}</span>
          {report.staff && (
            <span className="report-period">
              Staff: {staffLabel(report.staff)}
            </span>
          )}
          <span className="report-muted">
            Generated{" "}
            {format(new Date(report.generatedAt), "dd MMM yyyy, hh:mm a")}
          </span>
        </div>
      </header>

      <dl className="report-summary">
        {report.summary.map((item) => (
          <div key={item.label} className="report-summary-item">
            <dt>{item.label}</dt>
            <dd>{formatReportValue(item.value, item.type)}</dd>
          </div>
        ))}
      </dl>

      <table className="report-table">
        <thead>
          <tr>
            {report.columns.map((column) => (
              <th key={column.key} className={cellClass(column)}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.length ? (
            report.rows.map((row, index) => (
              <tr key={`${index}-${row[report.columns[0].key]}`}>
                {report.columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    <ReportValue value={row[column.key]} type={column.type} />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={report.columns.length} className="report-empty">
                No data for this period
              </td>
            </tr>
          )}
        </tbody>
        {report.totals && report.rows.length > 0 && (
          <tfoot>
            <tr>
              {report.columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>
                  {formatReportValue(report.totals[column.key], column.type)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>

      <footer className="report-foot">
        Tablewise · {report.title} · {outlet.name}
      </footer>
    </article>
  );
}
