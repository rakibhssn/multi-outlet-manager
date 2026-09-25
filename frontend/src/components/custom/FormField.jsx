import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function FormField({
  id,
  label,
  required,
  hint,
  error,
  showError = true,
  labelAction,
  meta,
  className,
  children,
}) {
  const visibleError = showError ? error : null;
  const message = visibleError || hint;

  return (
    <div className={cn("field", className)}>
      {(label || labelAction) && (
        <div className="field-label-row">
          {label && (
            <Label htmlFor={id} className="field-label">
              {label}
              {required && <span className="field-required">*</span>}
            </Label>
          )}
          {labelAction}
        </div>
      )}

      {children}

      {(message || meta) && (
        <div className="field-message-row">
          {message && (
            <p
              id={`${id}-${visibleError ? "error" : "hint"}`}
              className={visibleError ? "field-error" : "field-hint"}
            >
              {message}
            </p>
          )}
          {meta && <span className="field-meta">{meta}</span>}
        </div>
      )}
    </div>
  );
}
