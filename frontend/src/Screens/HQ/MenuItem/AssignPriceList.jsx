import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/Functions/Common";
import { isValidOutletPrice, isValidStock } from "@/lib/Schema/FormValidation";

export default function AssignPriceList({ options = [], selected = {}, onChange, emptyText }) {
  const toggle = (value, checked) => {
    const next = { ...selected };
    if (checked) next[value] = next[value] ?? { price: "", stock: "" };
    else delete next[value];
    onChange?.(next);
  };

  const update = (value, field, input) =>
    onChange?.({ ...selected, [value]: { ...selected[value], [field]: input } });

  if (!options.length) {
    return <p className="assign-outlet-empty">{emptyText}</p>;
  }

  return (
    <div className="assign-price-list">
      <div className="assign-price-head">
        <span>Assign</span>
        <span className="assign-price-head-fields">
          <span>Price</span>
          <span>Stock</span>
        </span>
      </div>
      {options.map((option) => {
        const checked = option.value in selected;
        const price = selected[option.value]?.price ?? "";
        const stock = selected[option.value]?.stock ?? "";
        const priceInvalid = checked && !isValidOutletPrice(price);
        const stockInvalid = checked && !isValidStock(stock);
        return (
          <div key={option.value} className={cn("assign-price-row", checked && "assign-price-row-active")}>
            <label className="assign-price-label">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => toggle(option.value, value === true)}
              />
              <span className="cell-stack">
                <span className="cell-title">{option.label}</span>
                <span className="cell-sub">
                  {option.sub ? `${option.sub} · ` : ""}Default {formatMoney(option.defaultPrice)}
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
              className={cn("assign-price-input", priceInvalid && "assign-price-input-invalid")}
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
              className={cn("assign-price-input assign-stock-input", stockInvalid && "assign-price-input-invalid")}
            />
          </div>
        );
      })}
    </div>
  );
}
