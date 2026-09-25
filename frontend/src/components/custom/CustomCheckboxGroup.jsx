import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { normalizeOptions, useFieldId } from "./fieldUtils";

export default function CustomCheckboxGroup({
  id,
  name,
  label,
  options = [],
  values = [],
  onChange,
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  gridClassName,
  itemClassName,
}) {
  const fieldId = useFieldId(id, name);
  const items = normalizeOptions(options);
  const selected = values.map(String);

  const toggle = (value, checked) =>
    onChange?.(
      checked ? [...selected, value] : selected.filter((v) => v !== value),
      name,
    );

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
      <div className={cn("choice-grid", gridClassName)}>
        {items.map((opt) => {
          const optionId = `${fieldId}-${opt.value}`;
          return (
            <div key={opt.value} className={cn("checkbox-row", itemClassName)}>
              <Checkbox
                id={optionId}
                checked={selected.includes(opt.value)}
                disabled={disabled || opt.disabled}
                onCheckedChange={(v) => toggle(opt.value, v === true)}
              />
              <Label htmlFor={optionId} className="checkbox-label">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </div>
    </FormField>
  );
}
