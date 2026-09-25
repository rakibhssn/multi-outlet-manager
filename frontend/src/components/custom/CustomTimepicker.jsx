import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuClock, LuX } from "react-icons/lu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { blurEvent, describedBy, useFieldId } from "./fieldUtils";

const PERIODS = ["AM", "PM"];
const pad = (n) => String(n).padStart(2, "0");

const parseTime = (v) => {
  if (!v) return null;
  if (v instanceof Date) return { h: v.getHours(), m: v.getMinutes() };
  const [h, m] = String(v).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
};

export const formatTime = (v, hour12 = true) => {
  const t = parseTime(v);
  if (!t) return "";
  if (!hour12) return `${pad(t.h)}:${pad(t.m)}`;
  return `${pad(t.h % 12 || 12)}:${pad(t.m)} ${t.h < 12 ? "AM" : "PM"}`;
};

export default function CustomTimepicker({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = "Pick a time",
  hour12 = true,
  minuteStep = 5,
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
  const time = parseTime(value);
  const invalid = !!(showError && error);

  const hours = useMemo(
    () =>
      hour12
        ? Array.from({ length: 12 }, (_, i) => i + 1)
        : Array.from({ length: 24 }, (_, i) => i),
    [hour12],
  );

  const minutes = useMemo(() => {
    const step = minuteStep > 0 && minuteStep <= 60 ? minuteStep : 1;
    return Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  }, [minuteStep]);

  const period = time ? (time.h < 12 ? "AM" : "PM") : null;
  const displayHour = time ? (hour12 ? time.h % 12 || 12 : time.h) : null;

  const commit = (h, m) => onChange?.(`${pad(h)}:${pad(m)}`, name);

  const handleOpenChange = (next) => {
    if (disabled) return;
    setOpen(next);
    if (!next) onBlur?.(blurEvent(name, value));
  };

  const pickHour = (hour) => {
    const h = hour12 ? (period === "PM" ? (hour % 12) + 12 : hour % 12) : hour;
    commit(h, time?.m ?? 0);
  };

  const pickMinute = (minute) => commit(time?.h ?? 0, minute);

  const pickPeriod = (p) => {
    const h = time?.h ?? 0;
    commit(p === "PM" ? (h % 12) + 12 : h % 12, time?.m ?? 0);
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
              <LuClock className="field-addon-icon" />
            </InputGroupAddon>
            <InputGroupInput
              id={fieldId}
              name={name}
              readOnly
              disabled={disabled}
              value={formatTime(value, hour12)}
              placeholder={placeholder}
              aria-invalid={invalid}
              aria-describedby={describedBy(fieldId, invalid && error, hint)}
              className="field-group-input field-picker-input"
            />
            {clearable && time && !disabled && (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  aria-label="Clear time"
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
        <PopoverContent align="start" className="field-popover time-columns">
          <TimeColumn open={open} items={hours} selected={displayHour} label={pad} onSelect={pickHour} />
          <TimeColumn open={open} items={minutes} selected={time?.m ?? null} label={pad} onSelect={pickMinute} />
          {hour12 && (
            <TimeColumn open={open} items={PERIODS} selected={period} label={(p) => p} onSelect={pickPeriod} />
          )}
        </PopoverContent>
      </Popover>
    </FormField>
  );
}

function TimeColumn({ open, items, selected, label, onSelect }) {
  const selectedRef = useRef(null);

  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <ScrollArea className="time-column">
      <div className="time-column-list" role="listbox">
        {items.map((item) => {
          const active = selected === item;
          return (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={active}
              ref={active ? selectedRef : undefined}
              onClick={() => onSelect(item)}
              className={cn("time-option", active && "time-option-active")}
            >
              {label(item)}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
