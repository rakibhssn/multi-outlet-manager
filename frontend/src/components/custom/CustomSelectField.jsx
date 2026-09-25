import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import {
  blurEvent,
  describedBy,
  normalizeOptions,
  renderIcon,
  useFieldId,
} from "./fieldUtils";

export default function CustomSelectField({
  id,
  name,
  label,
  value,
  onValueChange,
  onBlur,
  options = [],
  placeholder = "Select an option",
  preIcon,
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  inputClassName,
  itemClassName,
}) {
  const fieldId = useFieldId(id, name);
  const items = normalizeOptions(options);
  const current = value === null || value === undefined || value === "" ? null : String(value);
  const invalid = !!(showError && error);

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
      <Select
        items={items}
        name={name}
        value={current}
        onValueChange={(v) => onValueChange?.(v, name)}
        onOpenChange={(open) => !open && onBlur?.(blurEvent(name, current))}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={fieldId}
          aria-invalid={invalid}
          aria-describedby={describedBy(fieldId, invalid && error, hint)}
          className={cn("field-trigger", inputClassName)}
        >
          {renderIcon(preIcon, "field-trigger-icon")}
          <SelectValue placeholder={placeholder} className="field-trigger-text" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="field-select-content">
          {items.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className={itemClassName}
            >
              {renderIcon(opt.icon, "field-option-icon")}
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
