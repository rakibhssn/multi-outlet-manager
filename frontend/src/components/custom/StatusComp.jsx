import React from "react";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/Functions/Common";

const STATUS_TONE = {
  ACTIVE: "status-success",
  AVAILABLE: "status-success",
  INACTIVE: "status-danger",
  UNAVAILABLE: "status-warning",
  SOLD_OUT: "status-warning",
  DISCONTINUED: "status-muted",
  CONFIRMED: "status-info",
  COMPLETED: "status-success",
  CANCELLED: "status-danger",
  ON_SHIFT: "status-success",
  CRITICAL: "status-danger",
  LOW: "status-warning",
};

export default function StatusComp({
  type = "ACTIVE",
  label,
  tone,
  onClick,
  className,
}) {
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
