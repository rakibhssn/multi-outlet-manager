import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { LuChartColumn } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/Functions/Common";

const niceMax = (value) => {
  if (value <= 0) return 0;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return step * exponent;
};

const shortMoney = (value) =>
  value >= 1000
    ? `${(value / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
    : value.toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function OutletSalesChart({ data = [], sample = false }) {
  const [active, setActive] = useState(null);

  const days = useMemo(
    () =>
      data.map((row) => {
        const date = parseISO(row.date);
        return {
          ...row,
          amount: Number(row.amount ?? 0),
          day: format(date, "EEE"),
          full: format(date, "EEE, dd MMM"),
        };
      }),
    [data],
  );

  const total = days.reduce((sum, row) => sum + row.amount, 0);
  const max = niceMax(Math.max(0, ...days.map((row) => row.amount)));
  const peakIndex = total > 0 ? days.reduce((best, row, i) => (row.amount > days[best].amount ? i : best), 0) : -1;
  const ticks = max ? [max, max / 2, 0] : [];
  const hovered = active !== null ? days[active] : null;

  return (
    <section className="sales-card">
      <div className="sales-card-head">
        <div className="sales-card-heading">
          <h2 className="detail-card-title sales-card-title">
            Daily Sales
            {sample && <span className="sales-sample-badge">Sample data</span>}
          </h2>
          <span className="sales-card-total">{formatMoney(total)}</span>
          <span className="sales-card-caption">Last {days.length} days</span>
        </div>
        <span className="sales-card-icon">
          <LuChartColumn />
        </span>
      </div>

      <div className="sales-chart">
        {total > 0 && (
          <div className="sales-grid" aria-hidden="true">
            {ticks.map((tick) => (
              <div key={tick} className="sales-grid-line" style={{ bottom: `${(tick / max) * 100}%` }}>
                <span className="sales-grid-label">{shortMoney(tick)}</span>
              </div>
            ))}
          </div>
        )}

        <div className={cn("sales-bars", total > 0 && "sales-bars-axis")}>
          {days.map((row, index) => {
            const height = max ? Math.max((row.amount / max) * 100, row.amount > 0 ? 3 : 0) : 0;
            return (
              <button
                key={row.date}
                type="button"
                className="sales-bar-slot"
                aria-label={`${row.full}: ${formatMoney(row.amount)}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                <span className="sales-bar-track">
                  {index === peakIndex && (
                    <span className="sales-bar-peak" style={{ bottom: `${height}%` }}>
                      {shortMoney(row.amount)}
                    </span>
                  )}
                  <span
                    className={cn("sales-bar", active === index && "sales-bar-active", row.amount <= 0 && "sales-bar-empty")}
                    style={{ height: row.amount > 0 ? `${height}%` : undefined }}
                  />
                </span>
                <span className={cn("sales-bar-day", active === index && "sales-bar-day-active")}>
                  {row.day}
                </span>
              </button>
            );
          })}
        </div>

        {hovered && (
          <div
            className="sales-tooltip"
            role="status"
            style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
          >
            <span className="sales-tooltip-value">{formatMoney(hovered.amount)}</span>
            <span className="sales-tooltip-label">
              {hovered.full}
              {sample ? " · sample" : ""}
            </span>
          </div>
        )}

        {total === 0 && days.length > 0 && (
          <p className="sales-empty">No sales recorded yet</p>
        )}
      </div>

      <table className="sr-only">
        <caption>
          {sample ? "Sample daily sales" : "Daily sales"} for the last {days.length} days
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Sales</th>
          </tr>
        </thead>
        <tbody>
          {days.map((row) => (
            <tr key={row.date}>
              <td>{row.full}</td>
              <td>{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
