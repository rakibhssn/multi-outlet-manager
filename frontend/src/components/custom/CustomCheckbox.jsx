import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { describedBy, useFieldId } from "./fieldUtils";

export default function CustomCheckbox({
  id,
  name,
  label,
  value,
  checked,
  onChange,
  error,
  showError = true,
  hint,
  disabled,
  className,
}) {
  const fieldId = useFieldId(id, name);
  const visibleError = showError ? error : null;
  const message = visibleError || hint;

  return (
    <div className={cn("checkbox-field", className)}>
      <div className="checkbox-row">
        <Checkbox
          id={fieldId}
          name={name}
          checked={!!(checked ?? value)}
          onCheckedChange={(v) => onChange?.(v === true, name)}
          disabled={disabled}
          aria-invalid={!!visibleError}
          aria-describedby={describedBy(fieldId, visibleError, hint)}
        />
        {label && (
          <Label htmlFor={fieldId} className="checkbox-label">
            {label}
          </Label>
        )}
      </div>
      {message && (
        <p
          id={`${fieldId}-${visibleError ? "error" : "hint"}`}
          className={visibleError ? "field-error" : "field-hint"}
        >
          {message}
        </p>
      )}
    </div>
  );
}
