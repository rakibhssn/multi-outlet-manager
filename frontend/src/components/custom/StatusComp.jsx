import React from "react";
import { cn } from "@/lib/utils";

const STATUS_TONE = {
  ACTIVE: "status-success",
  AVAILABLE: "status-success",
  INACTIVE: "status-danger",
  UNAVAILABLE: "status-warning",
  SOLD_OUT: "status-warning",
  DISCONTINUED: "status-muted",
};

const humanize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusComp({ type = "ACTIVE", label, tone, onClick, className }) {
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "status-badge",
        tone ? `status-${tone}` : STATUS_TONE[type] || "status-muted",
        onClick && "status-badge-action",
        className,
      )}
    >
      <span className="status-dot" />
      {label ?? humanize(type)}
    </Tag>
  );
}
