import React from "react";
import { LuArrowDown, LuArrowUp, LuMinus } from "react-icons/lu";
import { formatAmount } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-heading">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatSlot({ label, icon: Icon, children }) {
  return (
    <div className="stat-slot">
      <div className="stat-slot-head">
        <span className="stat-slot-label">{label}</span>
        {Icon && (
          <span className="stat-slot-icon">
            <Icon />
          </span>
        )}
      </div>
      <div className="stat-slot-body">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  icon: Icon,
  value,
  meta,
  tone = "muted",
  loading = false,
  onClick,
  disabled = false,
}) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled || loading : undefined}
      className={cn("stat-card", onClick && "stat-card-action")}
    >
      <div className="stat-slot-head">
        <span className="stat-slot-label">{label}</span>
        {Icon && (
          <span className="stat-slot-icon">
            <Icon />
          </span>
        )}
      </div>
      {loading ? (
        <>
          <span className="stat-card-skeleton stat-card-skeleton-value" />
          <span className="stat-card-skeleton" />
        </>
      ) : (
        <>
          <span className="stat-card-value">{value}</span>
          {meta && (
            <span className={cn("stat-card-meta", `stat-card-meta-${tone}`)}>
              {meta}
            </span>
          )}
        </>
      )}
    </Tag>
  );
}

export function DashboardRow({ className, children }) {
  const items = React.Children.toArray(children);
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  return <div className={cn("dashboard-grid", className)}>{items}</div>;
}

export function DashboardEmpty() {
  return (
    <p className="dashboard-empty">
      No dashboard cards are enabled for your role.
    </p>
  );
}

export function ViewBox({ title, actions, className, children }) {
  return (
    <section className={cn("view-box", className)}>
      <div className="view-box-head">
        <h2 className="view-box-title">{title}</h2>
        {actions}
      </div>
      <div className="view-box-body">
        {children ?? <div className="view-box-empty" />}
      </div>
    </section>
  );
}

export function DetailCard({ title, items }) {
  return (
    <section className="detail-card">
      <h2 className="detail-card-title">{title}</h2>
      <dl className="detail-list">
        {items.map((item) => (
          <div key={item.label} className="detail-item">
            <dt className="detail-label">{item.label}</dt>
            <dd className="detail-value">{item.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function trendOf(change, today) {
  if (change === null) {
    return {
      tone: "up",
      meta: (
        <>
          <LuArrowUp /> New today · none yesterday
        </>
      ),
    };
  }
  if (!change) {
    return {
      tone: "muted",
      meta: (
        <>
          <LuMinus /> {today ? "Same as yesterday" : "No sales yet today"}
        </>
      ),
    };
  }
  const Arrow = change > 0 ? LuArrowUp : LuArrowDown;
  return {
    tone: change > 0 ? "up" : "down",
    meta: (
      <>
        <Arrow /> {Math.abs(change)}% vs yesterday
      </>
    ),
  };
}

export function CurrencyValue({ amount }) {
  return (
    <>
      <span className="stat-card-currency">৳</span>
      {formatAmount(amount)}
    </>
  );
}
