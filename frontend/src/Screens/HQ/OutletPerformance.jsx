import React, { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 60000;
const HEIGHT = 240;
const MARGIN = { top: 12, bottom: 28, left: 56 };
const END_LABEL_SPACE = 132;
const MIN_LABEL_GAP = 28;
const LABEL_OFFSET = 14;
const OTHER_COLOR = "var(--muted-foreground)";

const toDay = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

function compact(value) {
  if (value < 1000) return String(Math.round(value));
  const digits = value >= 10000 ? 0 : 1;
  return `${Number((value / 1000).toFixed(digits))}K`;
}

function tickAnchor(index, count) {
  if (index === 0) return "start";
  if (index === count - 1) return "end";
  return "middle";
}

function niceMax(value) {
  if (value <= 0) return 100;
  const step = 10 ** Math.floor(Math.log10(value));
  const nice = [1, 2, 2.5, 5, 10].find((factor) => factor * step >= value);
  return nice * step;
}

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function colorFor(series) {
  const named = series
    .filter((item) => item.id !== "other")
    .map((item) => item.name)
    .sort();
  return (item) =>
    item.id === "other"
      ? OTHER_COLOR
      : `var(--series-${named.indexOf(item.name) + 1})`;
}

function Legend({ series, color }) {
  return (
    <ul className="trend-legend">
      {series.map((item) => (
        <li key={item.id}>
          <span className="trend-key" style={{ background: color(item) }} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function TrendTable({ days, series }) {
  return (
    <div className="trend-table-wrap">
      <table className="trend-table">
        <thead>
          <tr>
            <th>Outlet</th>
            {days.map((day) => (
              <th key={day}>{format(toDay(day), "EEE d")}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {series.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              {item.values.map((value, index) => (
                <td key={days[index]}>{formatMoney(value)}</td>
              ))}
              <td>{formatMoney(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function endLabels(series, y, withLabels) {
  if (!withLabels) return [];
  const labels = series
    .map((item) => ({ item, y: y(item.values.at(-1)) }))
    .sort((a, b) => a.y - b.y);
  const collide = labels.some(
    (label, index) =>
      index > 0 && label.y - labels[index - 1].y < MIN_LABEL_GAP,
  );
  return collide ? [] : labels;
}

function interiorTangent([x0, y0], [x1, y1], [x2, y2]) {
  const h0 = x1 - x0;
  const h1 = x2 - x1;
  const s0 = (y1 - y0) / h0;
  const s1 = (y2 - y1) / h1;
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (
    (Math.sign(s0) + Math.sign(s1)) *
      Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  );
}

function edgeTangent([x0, y0], [x1, y1], neighbour) {
  const h = x1 - x0;
  return h ? (3 * ((y1 - y0) / h) - neighbour) / 2 : neighbour;
}

function monotonePath(points) {
  if (points.length < 2)
    return points.length ? `M${points[0][0]},${points[0][1]}` : "";
  if (points.length === 2)
    return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;
  const inner = points
    .slice(1, -1)
    .map((point, index) =>
      interiorTangent(points[index], point, points[index + 2]),
    );
  const tangents = [
    edgeTangent(points[0], points[1], inner[0]),
    ...inner,
    edgeTangent(points.at(-2), points.at(-1), inner.at(-1)),
  ];
  return points.reduce((path, [px, py], index) => {
    if (index === 0) return `M${px},${py}`;
    const [x0, y0] = points[index - 1];
    const third = (px - x0) / 3;
    return `${path} C${x0 + third},${y0 + tangents[index - 1] * third} ${px - third},${py - tangents[index] * third} ${px},${py}`;
  }, "");
}

const NEAREST_LIMIT = 32;
const OVERLAP_PX = 3;

function nearestPoints(series, index, pointerY, y) {
  const distances = series.map((item) => ({
    item,
    gap: Math.abs(y(item.values[index]) - pointerY),
  }));
  const closest = Math.min(...distances.map((entry) => entry.gap));
  if (closest > NEAREST_LIMIT) return [];
  return distances
    .filter((entry) => entry.gap - closest <= OVERLAP_PX)
    .map((entry) => entry.item);
}

function changeText(values, index) {
  if (index === 0) return null;
  const before = values[index - 1];
  const now = values[index];
  if (!before)
    return now ? "New sales vs previous day" : "Same as previous day";
  const percent = Math.round(((now - before) / before) * 1000) / 10;
  if (!percent) return "Same as previous day";
  return `${percent > 0 ? "↑" : "↓"} ${Math.abs(percent)}% vs previous day`;
}

function PointTip({ hover, days, color, x, y, flip }) {
  const { index, items } = hover;
  return (
    <output
      className={cn("trend-tip trend-point-tip", flip && "trend-tip-left")}
      style={{
        left: x(index),
        top: Math.max(y(items[0].values[index]) - 12, 0),
      }}
    >
      <span className="trend-tip-day">
        {format(toDay(days[index]), "EEEE, dd MMM")}
      </span>
      {items.map((item) => (
        <span key={item.id} className="trend-point-row">
          <span className="trend-tip-row">
            <span
              className="trend-tip-key"
              style={{ background: color(item) }}
            />
            <strong>{formatMoney(item.values[index])}</strong>
            <span>{item.name}</span>
          </span>
          {changeText(item.values, index) && (
            <span className="trend-point-sub">
              {changeText(item.values, index)}
            </span>
          )}
          <span className="trend-point-sub">
            7-day total {formatMoney(item.total)}
          </span>
        </span>
      ))}
    </output>
  );
}

function DayReadout({ index, days, series, color, x, flip }) {
  const readout = [...series].sort((a, b) => b.values[index] - a.values[index]);
  return (
    <output
      className={cn("trend-tip", flip && "trend-tip-left")}
      style={{ left: x(index) }}
    >
      <span className="trend-tip-day">
        {format(toDay(days[index]), "EEEE, dd MMM")}
      </span>
      {readout.map((item) => (
        <span key={item.id} className="trend-tip-row">
          <span className="trend-tip-key" style={{ background: color(item) }} />
          <strong>{formatMoney(item.values[index])}</strong>
          <span>{item.name}</span>
        </span>
      ))}
    </output>
  );
}

function TrendChart({ days, series, color }) {
  const frame = useRef(null);
  const width = useWidth(frame);
  const [focusDay, setFocusDay] = useState(null);
  const [hover, setHover] = useState(null);
  const withLabels = series.length <= 4;
  const right = withLabels ? END_LABEL_SPACE : 16;
  const plotWidth = Math.max(width - MARGIN.left - right, 10);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const top = niceMax(Math.max(...series.flatMap((item) => item.values), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * top);
  const last = days.length - 1;
  const x = (index) =>
    MARGIN.left + (last > 0 ? (index / last) * plotWidth : plotWidth / 2);
  const y = (value) => MARGIN.top + plotHeight - (value / top) * plotHeight;
  const labels = endLabels(series, y, withLabels);
  const single = series.length === 1;
  const flip = (index) => x(index) > MARGIN.left + plotWidth / 2;
  const clampDay = (value) => Math.min(Math.max(value, 0), last);

  const onPointerMove = (event) => {
    const box = frame.current.getBoundingClientRect();
    const index = clampDay(
      Math.round(((event.clientX - box.left - MARGIN.left) / plotWidth) * last),
    );
    const items = nearestPoints(series, index, event.clientY - box.top, y);
    setHover(items.length ? { index, items } : null);
  };

  const onKey = (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    setFocusDay((current) => clampDay((current ?? last) + step));
  };

  const current = focusDay ?? last;
  const valueText = `${format(toDay(days[current]), "EEEE, dd MMM")}: ${series
    .map((item) => `${item.name} ${formatMoney(item.values[current])}`)
    .join(", ")}`;
  const isHovered = (item, index) =>
    hover?.index === index && hover.items.includes(item);

  return (
    <div ref={frame} className="trend-frame">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          className="trend-svg"
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                className="trend-grid"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                className="trend-tick"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {compact(tick)}
              </text>
            </g>
          ))}
          {days.map((day, index) => (
            <text
              key={day}
              x={x(index)}
              y={HEIGHT - 8}
              className="trend-tick"
              textAnchor={tickAnchor(index, days.length)}
            >
              {format(toDay(day), "EEE d")}
            </text>
          ))}
          {focusDay !== null && (
            <line
              x1={x(focusDay)}
              x2={x(focusDay)}
              y1={MARGIN.top}
              y2={MARGIN.top + plotHeight}
              className="trend-crosshair"
            />
          )}
          {series.map((item) => {
            const points = item.values.map((value, index) => [
              x(index),
              y(value),
            ]);
            const path = monotonePath(points);
            return (
              <g key={item.id}>
                {single && (
                  <path
                    d={`${path} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`}
                    fill={color(item)}
                    opacity="0.1"
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  stroke={color(item)}
                  className="trend-line"
                />
                {points.map(([px, py], index) => (
                  <circle
                    key={days[index]}
                    cx={px}
                    cy={py}
                    r={isHovered(item, index) ? 6 : 4}
                    fill={color(item)}
                    className="trend-dot"
                  />
                ))}
              </g>
            );
          })}
          {labels.map(({ item, y: labelY }) => {
            const labelX = MARGIN.left + plotWidth + LABEL_OFFSET;
            return (
              <text
                key={item.id}
                x={labelX}
                y={labelY - 6}
                className="trend-end"
                dominantBaseline="middle"
              >
                <tspan className="trend-end-name">{item.name}</tspan>
                <tspan x={labelX} dy="13" className="trend-end-value">
                  {formatMoney(item.values.at(-1))}
                </tspan>
              </text>
            );
          })}
        </svg>
      )}
      <div
        className={cn("trend-hit", hover && "trend-hit-point")}
        style={{
          left: MARGIN.left - 12,
          width: plotWidth + 24,
          top: MARGIN.top - 12,
          height: plotHeight + 24,
        }}
        tabIndex={0}
        role="slider"
        aria-label="Daily revenue per outlet. Use left and right arrows to read each day."
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={current}
        aria-valuetext={valueText}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setFocusDay((value) => value ?? last)}
        onBlur={() => setFocusDay(null)}
        onKeyDown={onKey}
      />
      {hover && (
        <PointTip
          hover={hover}
          days={days}
          color={color}
          x={x}
          y={y}
          flip={flip(hover.index)}
        />
      )}
      {!hover && focusDay !== null && (
        <DayReadout
          index={focusDay}
          days={days}
          series={series}
          color={color}
          x={x}
          flip={flip(focusDay)}
        />
      )}
    </div>
  );
}

export default function OutletPerformance() {
  const notify = useNotify();
  const [trend, setTrend] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("chart");

  usePolling(() => {
    setRefreshing(true);
    notify
      .load(ApiService.get(API_LINK.CompanyTrend), {
        errorText: "Failed to load outlet performance",
        onSuccess: (res) => setTrend(res.data),
      })
      .finally(() => setRefreshing(false));
  }, REFRESH_INTERVAL);

  const series = useMemo(() => trend?.series ?? [], [trend]);
  const color = useMemo(() => colorFor(series), [series]);

  return (
    <ViewBox
      title="Outlet Performance · revenue, last 7 days"
      className="dashboard-span-2"
      actions={
        series.length > 0 && (
          <button
            type="button"
            className="view-box-link"
            onClick={() =>
              setView((current) => (current === "chart" ? "table" : "chart"))
            }
          >
            {view === "chart" ? "Show table" : "Show chart"}
          </button>
        )
      }
    >
      {trend === null && <Skeleton className="h-64 rounded-md" />}
      {trend && series.length === 0 && (
        <p className="dashboard-empty">No outlets yet.</p>
      )}
      {series.length > 0 && (
        <div className={cn("trend", refreshing && "trend-refreshing")}>
          {series.length > 1 && <Legend series={series} color={color} />}
          {view === "chart" ? (
            <TrendChart days={trend.days} series={series} color={color} />
          ) : (
            <TrendTable days={trend.days} series={series} />
          )}
        </div>
      )}
    </ViewBox>
  );
}
