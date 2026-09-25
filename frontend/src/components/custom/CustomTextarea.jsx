import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { describedBy, useFieldId } from "./fieldUtils";

export default function CustomTextarea({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
  maxLength,
  minLength,
  showCount = !!maxLength,
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  inputClassName,
  ...rest
}) {
  const fieldId = useFieldId(id, name);
  const length = (value ?? "").length;
  const invalid = !!(showError && error);
  const belowMinimum = minLength !== undefined && length > 0 && length < minLength;
  const limitReached = maxLength !== undefined && length >= maxLength;

  return (
    <FormField
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      showError={showError}
      labelAction={labelAction}
      meta={
        showCount ? (
          <span className={cn((belowMinimum || limitReached) && "field-meta-alert")}>
            {maxLength ? `${length} / ${maxLength}` : length}
            {belowMinimum ? ` (min ${minLength})` : null}
          </span>
        ) : null
      }
      className={className}
    >
      <Textarea
        id={fieldId}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        minLength={minLength}
        required={required}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy(fieldId, invalid && error, hint)}
        className={cn("field-textarea", inputClassName)}
        {...rest}
      />
    </FormField>
  );
}
