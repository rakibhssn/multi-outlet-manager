import React, { useMemo, useState } from "react";
import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";
import { LuCalendarDays, LuX } from "react-icons/lu";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { blurEvent, describedBy, useFieldId } from "./fieldUtils";

const toDate = (v) => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : parseISO(v);
  return isValid(d) ? d : undefined;
};

export default function CustomDatepicker({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  dateFormat = "dd MMM yyyy",
  minDate,
  maxDate,
  disabledDates,
  startMonth,
  endMonth,
  clearable = true,
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
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const invalid = !!(showError && error);

  const disabledMatchers = useMemo(
    () =>
      [
        toDate(minDate) && { before: startOfDay(toDate(minDate)) },
        toDate(maxDate) && { after: endOfDay(toDate(maxDate)) },
        ...(disabledDates ? [].concat(disabledDates) : []),
      ].filter(Boolean),
    [minDate, maxDate, disabledDates],
  );

  const handleOpenChange = (next) => {
    if (disabled) return;
    setOpen(next);
    if (!next) onBlur?.(blurEvent(name, value));
  };

  const handleSelect = (date) => {
    onChange?.(date ?? null, name);
    setOpen(false);
    onBlur?.(blurEvent(name, value));
  };

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
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          nativeButton={false}
          disabled={disabled}
          render={<div className={cn("field-picker", disabled && "field-picker-disabled")} />}
        >
          <InputGroup
            data-disabled={disabled || undefined}
            className={cn("field-group", inputClassName)}
          >
            <InputGroupAddon align="inline-start">
              <LuCalendarDays className="field-addon-icon" />
            </InputGroupAddon>
            <InputGroupInput
              id={fieldId}
              name={name}
              readOnly
              disabled={disabled}
              value={selected ? format(selected, dateFormat) : ""}
              placeholder={placeholder}
              aria-invalid={invalid}
              aria-describedby={describedBy(fieldId, invalid && error, hint)}
              className="field-group-input field-picker-input"
            />
            {clearable && selected && !disabled && (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  aria-label="Clear date"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange?.(null, name);
                  }}
                  className="field-icon-button"
                >
                  <LuX />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </PopoverTrigger>
        <PopoverContent align="start" className="field-popover">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={handleSelect}
            disabled={disabledMatchers}
            startMonth={startMonth ?? toDate(minDate)}
            endMonth={endMonth ?? toDate(maxDate)}
            captionLayout="dropdown"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
}
