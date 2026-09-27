import React, { useMemo, useRef, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { InputField } from "@/components/custom";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/Functions/Common";
import { isValidOutletPrice, isValidStock } from "@/lib/Schema/FormValidation";

export function assignError(rows, emptyText) {
  if (!rows.length) return emptyText;
  if (rows.some((row) => !isValidOutletPrice(row.price)))
    return "Outlet price must be a positive number";
  if (rows.some((row) => !isValidStock(row.stock)))
    return "Stock must be a whole number of 0 or more";
  return null;
}

export default function AssignPriceList({
  options = [],
  selected = {},
  onChange,
  emptyText,
  onSearch,
  loading = false,
  searchPlaceholder = "Search...",
}) {
  const picked = useRef({});
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const visible = new Set(options.map((option) => option.value));
    const hidden = Object.keys(selected)
      .filter((value) => !visible.has(value) && picked.current[value])
      .map((value) => picked.current[value]);
    return [...hidden, ...options];
  }, [options, selected]);

  const toggle = (option, checked) => {
    const next = { ...selected };
    if (checked) {
      picked.current[option.value] = option;
      next[option.value] = next[option.value] ?? { price: "", stock: "" };
    } else {
      delete next[option.value];
    }
    onChange?.(next);
  };

  const update = (value, field, input) =>
    onChange?.({
      ...selected,
      [value]: { ...selected[value], [field]: input },
    });

  const searchBox = onSearch && (
    <InputField
      name="assign-search"
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        onSearch(e.target.value);
      }}
      placeholder={searchPlaceholder}
      preIcon={LuSearch}
    />
  );

  let body;
  if (loading && !rows.length) {
    body = (
      <p className="assign-outlet-empty">
        <Spinner className="field-addon-icon" />
      </p>
    );
  } else if (!rows.length) {
    body = (
      <p className="assign-outlet-empty">
        {search.trim() ? "No match found." : emptyText}
      </p>
    );
  }

  if (body) {
    return searchBox ? (
      <div className="assign-item-body">
        {searchBox}
        {body}
      </div>
    ) : (
      body
    );
  }

  const list = (
    <div className="assign-price-list">
      <div className="assign-price-head">
        <span>Assign</span>
        <span className="assign-price-head-fields">
          <span>Price</span>
          <span>Stock</span>
        </span>
      </div>
      {rows.map((option) => {
        const checked = option.value in selected;
        const price = selected[option.value]?.price ?? "";
        const stock = selected[option.value]?.stock ?? "";
        const priceInvalid = checked && !isValidOutletPrice(price);
        const stockInvalid = checked && !isValidStock(stock);
        return (
          <div
            key={option.value}
            className={cn(
              "assign-price-row",
              checked && "assign-price-row-active",
            )}
          >
            <label className="assign-price-label">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => toggle(option, value === true)}
              />
              <span className="cell-stack">
                <span className="cell-title">{option.label}</span>
                <span className="cell-sub">
                  {option.sub ? `${option.sub} · ` : ""}Default{" "}
                  {formatMoney(option.defaultPrice)}
                </span>
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={!checked}
              value={price}
              placeholder={formatMoney(option.defaultPrice)}
              aria-label={`Outlet price for ${option.label}`}
              aria-invalid={priceInvalid}
              onChange={(e) => update(option.value, "price", e.target.value)}
              className={cn(
                "assign-price-input",
                priceInvalid && "assign-price-input-invalid",
              )}
            />
            <input
              type="number"
              min="0"
              step="1"
              disabled={!checked}
              value={stock}
              placeholder="0"
              aria-label={`Stock for ${option.label}`}
              aria-invalid={stockInvalid}
              onChange={(e) => update(option.value, "stock", e.target.value)}
              className={cn(
                "assign-price-input assign-stock-input",
                stockInvalid && "assign-price-input-invalid",
              )}
            />
          </div>
        );
      })}
    </div>
  );

  return searchBox ? (
    <div className="assign-item-body">
      {searchBox}
      {list}
    </div>
  ) : (
    list
  );
}
