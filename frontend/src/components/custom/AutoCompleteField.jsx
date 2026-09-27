import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuX } from "react-icons/lu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import FormField from "./FormField";
import { describedBy, normalizeOptions, renderIcon, useFieldId } from "./fieldUtils";

export default function AutoCompleteField({
  id,
  name,
  label,
  value,
  options = [],
  onValueChange,
  onSearch,
  searchValue,
  onBlur,
  placeholder,
  preIcon,
  filterLocally = true,
  openOnFocus = true,
  clearable = false,
  loading = false,
  emptyMessage = "No items found",
  error,
  showError = true,
  hint,
  required,
  disabled,
  labelAction,
  className,
  inputClassName,
  contentClassName,
  itemClassName,
}) {
  const fieldId = useFieldId(id, name);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);
  const skipBlur = useRef(false);
  const lastSelected = useRef(null);
  const emitted = useRef("");
  const items = useMemo(() => normalizeOptions(options), [options]);
  const current = value === null || value === undefined ? null : String(value);
  const invalid = !!(showError && error);

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [internalSearch, setInternalSearch] = useState("");

  const controlledSearch = searchValue !== undefined;
  const search = controlledSearch ? searchValue : internalSearch;

  const selected = useMemo(() => {
    const found = items.find((opt) => opt.value === current);
    if (found) return found;
    return lastSelected.current?.value === current ? lastSelected.current : null;
  }, [items, current]);

  useEffect(() => {
    if (selected) lastSelected.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!open && !controlledSearch) setInternalSearch(selected?.label ?? "");
  }, [open, controlledSearch, selected]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!filterLocally || !typed || !keyword) return items;
    return items.filter((opt) => opt.label.toLowerCase().includes(keyword));
  }, [items, search, filterLocally, typed]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e) => {
      if (!wrapperRef.current?.contains(e.target)) closeList();
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  });

  useEffect(() => {
    if (highlight < 0) return;
    listRef.current
      ?.querySelectorAll("[data-slot='autocomplete-item']")
      ?.[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const updateSearch = (next) => {
    if (!controlledSearch) setInternalSearch(next);
    emitted.current = next;
    onSearch?.(next);
  };

  const resetSearch = (label) => {
    if (controlledSearch) {
      onSearch?.(label);
      return;
    }
    setInternalSearch(label);
    if (emitted.current) {
      emitted.current = "";
      onSearch?.("");
    }
  };

  function openList() {
    if (disabled) return;
    if (!controlledSearch && emitted.current) {
      emitted.current = "";
      onSearch?.("");
    }
    setTyped(false);
    setHighlight(filtered.findIndex((opt) => opt.value === current));
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setTyped(false);
    setHighlight(-1);
    if (!controlledSearch) resetSearch(selected?.label ?? "");
  }

  const handleSelect = (opt) => {
    lastSelected.current = opt;
    onValueChange?.(opt.value, name, opt);
    resetSearch(opt.label);
    setOpen(false);
    setTyped(false);
    setHighlight(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange?.(null, name, undefined);
    updateSearch("");
    setTyped(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      if (!filtered.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((prev) => (prev + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && open && filtered[highlight]) {
      e.preventDefault();
      handleSelect(filtered[highlight]);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      closeList();
    }
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
      <div ref={wrapperRef} className="autocomplete">
        <InputGroup
          data-disabled={disabled || undefined}
          className={cn("field-group", inputClassName)}
        >
          {preIcon && (
            <InputGroupAddon align="inline-start">
              {renderIcon(preIcon, "field-addon-icon")}
            </InputGroupAddon>
          )}
          <InputGroupInput
            id={fieldId}
            name={name}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-invalid={invalid}
            aria-describedby={describedBy(fieldId, invalid && error, hint)}
            autoComplete="off"
            disabled={disabled}
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              updateSearch(e.target.value);
              setTyped(true);
              setHighlight(-1);
              setOpen(true);
            }}
            onFocus={() => openOnFocus && openList()}
            onClick={() => !open && openList()}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              onBlur?.(e);
            }}
            className="field-group-input"
          />
          <InputGroupAddon align="inline-end">
            {clearable && current && !disabled && (
              <button
                type="button"
                aria-label="Clear"
                onClick={handleClear}
                className="field-icon-button"
              >
                <LuX />
              </button>
            )}
            {loading ? (
              <Spinner className="field-addon-icon" />
            ) : (
              <button
                type="button"
                tabIndex={-1}
                aria-label={open ? "Close list" : "Open list"}
                disabled={disabled}
                onClick={() => (open ? closeList() : openList())}
                className="field-icon-button"
              >
                <LuChevronDown className={cn("autocomplete-chevron", open && "autocomplete-chevron-open")} />
              </button>
            )}
          </InputGroupAddon>
        </InputGroup>

        {open && (
          <div
            ref={listRef}
            role="listbox"
            onMouseDown={() => {
              skipBlur.current = true;
            }}
            className={cn("autocomplete-list", contentClassName)}
          >
            {loading ? (
              <div className="autocomplete-empty">
                <Spinner className="field-addon-icon" /> Loading...
              </div>
            ) : filtered.length ? (
              filtered.map((opt, index) => (
                <div
                  key={opt.value}
                  data-slot="autocomplete-item"
                  role="option"
                  aria-selected={opt.value === current}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "autocomplete-item",
                    index === highlight && "autocomplete-item-active",
                    opt.value === current && "autocomplete-item-selected",
                    itemClassName,
                  )}
                >
                  {renderIcon(opt.icon, "field-option-icon")}
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="autocomplete-empty">{emptyMessage}</div>
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}
