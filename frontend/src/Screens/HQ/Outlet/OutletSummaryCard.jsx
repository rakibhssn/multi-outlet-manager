import React from "react";
import {
  LuArrowUpRight,
  LuPackage,
  LuPackageCheck,
  LuPackageX,
  LuWallet,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/Functions/Common";

export default function OutletSummaryCard({ summary = {}, onStockOutClick }) {
  const assigned = summary.assignedItems ?? 0;
  const inStock = summary.inStock ?? 0;
  const stockOut = summary.stockOut ?? 0;
  const sales = Number(summary.salesAmount ?? 0);
  const health = assigned ? Math.round((inStock / assigned) * 100) : 0;
  const tone = !assigned ? "idle" : health >= 80 ? "good" : health >= 50 ? "warn" : "bad";

  return (
    <section className="summary-card">
      <h2 className="detail-card-title">Summary</h2>

      <div className="summary-hero">
        <div className="summary-hero-text">
          <span className="summary-hero-label">Sales Amount</span>
          <span className="summary-hero-value">{formatMoney(sales)}</span>
          <span className="summary-hero-note">
            {sales > 0 ? "Total recorded sales" : "No sales recorded yet"}
          </span>
        </div>
        <span className="summary-hero-icon">
          <LuWallet />
        </span>
      </div>

      <div className="summary-tiles">
        <div className="summary-tile">
          <span className="summary-tile-icon summary-tile-icon-neutral">
            <LuPackage />
          </span>
          <span className="summary-tile-value">{assigned}</span>
          <span className="summary-tile-label">Assigned</span>
        </div>

        <div className="summary-tile">
          <span className="summary-tile-icon summary-tile-icon-good">
            <LuPackageCheck />
          </span>
          <span className="summary-tile-value">{inStock}</span>
          <span className="summary-tile-label">In Stock</span>
        </div>

        <button
          type="button"
          onClick={onStockOutClick}
          disabled={!stockOut}
          className={cn("summary-tile summary-tile-action", stockOut > 0 && "summary-tile-alert")}
          aria-label={`${stockOut} items stocked out${stockOut ? ", view items" : ""}`}
        >
          <span className="summary-tile-icon summary-tile-icon-bad">
            <LuPackageX />
          </span>
          {stockOut > 0 && <LuArrowUpRight className="summary-tile-arrow" />}
          <span className="summary-tile-value">{stockOut}</span>
          <span className="summary-tile-label">Stock Out</span>
        </button>
      </div>

      <div className="summary-meter">
        <div className="summary-meter-head">
          <span>Stock health</span>
          <span className={cn("summary-meter-value", `summary-meter-${tone}`)}>
            {assigned ? `${health}%` : "No items"}
          </span>
        </div>
        <div
          className="summary-meter-track"
          role="progressbar"
          aria-label="Stock health"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={health}
        >
          <span
            className={cn("summary-meter-fill", `summary-meter-fill-${tone}`)}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>
    </section>
  );
}
