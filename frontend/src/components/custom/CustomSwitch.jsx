import React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { describedBy, useFieldId } from "./fieldUtils";

export default function CustomSwitch({
  id,
  name,
  label,
  value,
  checked,
  onChange,
  onLabel = "On",
  offLabel = "Off",
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  inputClassName,
}) {
  const fieldId = useFieldId(id, name);
  const isOn = !!(checked ?? value);
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
      <label
        htmlFor={fieldId}
        className={cn("switch-box", disabled && "switch-box-disabled", inputClassName)}
      >
        <Switch
          id={fieldId}
          name={name}
          checked={isOn}
          onCheckedChange={(next) => onChange?.(next, name)}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy(fieldId, invalid && error, hint)}
        />
        <span className={cn("switch-text", isOn && "switch-text-on")}>
          {isOn ? onLabel : offLabel}
        </span>
      </label>
    </FormField>
  );
}
