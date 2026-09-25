import React from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderIcon } from "./fieldUtils";

const SIZE_CLASS = {
  sm: "app-btn-sm",
  md: "app-btn-md",
  lg: "app-btn-lg",
  icon: "app-btn-icon-only",
};

export default function AnimateButton({
  label,
  children,
  type = "button",
  variant = "default",
  size = "md",
  loading = false,
  loadingText,
  preIcon,
  postIcon,
  fullWidth = false,
  disabled,
  className,
  ...rest
}) {
  const content = children ?? label;

  return (
    <Button
      type={type}
      variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "app-btn",
        SIZE_CLASS[size] || SIZE_CLASS.md,
        fullWidth && "app-btn-block",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LuLoaderCircle className="app-btn-icon app-btn-spinner" />
      ) : (
        renderIcon(preIcon, "app-btn-icon")
      )}
      {loading && loadingText ? loadingText : content}
      {!loading && renderIcon(postIcon, "app-btn-icon app-btn-icon-right")}
    </Button>
  );
}
