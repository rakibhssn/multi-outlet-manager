import React from "react";
import { StatusComp } from "@/components/custom";
import { StackCell } from "@/Screens/Layout/TableCells";
import { ORDER_TYPE_OPTIONS } from "@/lib/Constant";
import {
  formatDateTime,
  formatMoney,
  fullName,
  labelOf,
  plural,
} from "@/lib/Functions/Common";

export function OrderMeta({ items }) {
  return (
    <dl className="order-confirm-meta">
      {items.filter(Boolean).map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OrderLines({ lines, totalItems, totalAmount }) {
  return (
    <div className="order-lines">
      {lines.map((line) => (
        <div key={line.id} className="order-line">
          <span className="cell-stack">
            <span className="cell-title">{line.name}</span>
            <span className="cell-sub">
              {line.quantity} × {formatMoney(line.unitPrice)}
            </span>
          </span>
          <span className="order-line-total">
            {formatMoney(line.lineTotal)}
          </span>
        </div>
      ))}
      <div className="order-line order-line-total-row">
        <span>Total · {plural(totalItems, "item")}</span>
        <span className="order-line-total">{formatMoney(totalAmount)}</span>
      </div>
    </div>
  );
}

export const orderCells = (item) => ({
  order: (
    <StackCell
      title={item.orderNumber}
      subtitle={formatDateTime(item.confirmedAt)}
    />
  ),
  outlet: (
    <StackCell title={item.outlet?.name} subtitle={item.outlet?.parent?.name} />
  ),
  server: (
    <StackCell
      title={fullName(item.server) || "—"}
      subtitle={item.customerName ?? "Walk-in"}
    />
  ),
  type: (
    <StackCell
      title={labelOf(ORDER_TYPE_OPTIONS, item.orderType)}
      subtitle={item.tableNumber ? `Table ${item.tableNumber}` : "—"}
    />
  ),
  items: <span className="stock-count">{item.totalItems}</span>,
  total: <span className="stock-count">{formatMoney(item.totalAmount)}</span>,
  status: <StatusComp type={item.status} />,
});
