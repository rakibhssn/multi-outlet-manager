import React from "react";
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

export function ViewBox({ title, actions, className, children }) {
  return (
    <section className={cn("view-box", className)}>
      <div className="view-box-head">
        <h2 className="view-box-title">{title}</h2>
        {actions}
      </div>
      <div className="view-box-body">{children ?? <div className="view-box-empty" />}</div>
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
