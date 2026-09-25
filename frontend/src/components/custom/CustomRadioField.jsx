import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { normalizeOptions, useFieldId } from "./fieldUtils";

export default function CustomRadioField({
  id,
  name,
  label,
  options = [],
  value,
  onValueChange,
  orientation = "horizontal",
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  groupClassName,
  itemClassName,
}) {
  const fieldId = useFieldId(id, name);
  const items = normalizeOptions(options);
  const current = value === null || value === undefined ? null : String(value);

  return (
    <FormField
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
      labelAction={labelAction}
      className={className}
    >
      <RadioGroup
        name={name}
        value={current}
        disabled={disabled}
        onValueChange={(v) => onValueChange?.(v ?? null, name)}
        className={cn(
          "radio-group",
          orientation === "horizontal" && "radio-group-row",
          groupClassName,
        )}
      >
        {items.map((opt) => {
          const optionId = `${fieldId}-${opt.value}`;
          return (
            <div key={opt.value} className={cn("checkbox-row", itemClassName)}>
              <RadioGroupItem id={optionId} value={opt.value} disabled={opt.disabled} />
              <Label htmlFor={optionId} className="checkbox-label">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </FormField>
  );
}
