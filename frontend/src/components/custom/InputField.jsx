import React, { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { describedBy, renderIcon, useFieldId } from "./fieldUtils";

export default function InputField({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  preIcon,
  preClick,
  postIcon,
  postClick,
  error,
  showError = true,
  hint,
  required,
  disabled,
  readOnly,
  labelAction,
  className,
  inputClassName,
  ...rest
}) {
  const fieldId = useFieldId(id, name);
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
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
      <InputGroup
        data-disabled={disabled || undefined}
        className={cn("field-group", inputClassName)}
      >
        {preIcon && (
          <InputGroupAddon
            align="inline-start"
            onClick={disabled ? undefined : preClick}
            className={cn(preClick && !disabled && "field-addon-action")}
          >
            {renderIcon(preIcon, "field-addon-icon")}
          </InputGroupAddon>
        )}
        <InputGroupInput
          id={fieldId}
          name={name}
          type={isPassword && reveal ? "text" : type}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid}
          aria-describedby={describedBy(fieldId, invalid && error, hint)}
          className="field-group-input"
          {...rest}
        />
        {isPassword && (
          <InputGroupAddon align="inline-end">
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="field-icon-button"
              disabled={disabled}
            >
              {reveal ? <LuEyeOff /> : <LuEye />}
            </button>
          </InputGroupAddon>
        )}
        {postIcon && (
          <InputGroupAddon
            align="inline-end"
            onClick={disabled ? undefined : postClick}
            className={cn(postClick && !disabled && "field-addon-action")}
          >
            {renderIcon(postIcon, "field-addon-icon")}
          </InputGroupAddon>
        )}
      </InputGroup>
    </FormField>
  );
}
