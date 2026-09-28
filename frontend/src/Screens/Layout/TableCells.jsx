import React from "react";
import { formatMoney } from "@/lib/Functions/Common";

export function StackCell({ title, subtitle }) {
  return (
    <div className="cell-stack">
      <span className="cell-title">{title}</span>
      {subtitle && <span className="cell-sub">{subtitle}</span>}
    </div>
  );
}

export function ThumbCell({ image, title, subtitle }) {
  return (
    <div className="menu-cell">
      {image ? (
        <img src={image} alt={title} className="menu-thumb" />
      ) : (
        <span className="menu-thumb menu-thumb-empty">{title?.charAt(0)}</span>
      )}
      <StackCell title={title} subtitle={subtitle} />
    </div>
  );
}

export function StockCell({ stock }) {
  return stock > 0 ? (
    <span className="stock-count">{stock}</span>
  ) : (
    <span className="stock-out">Out</span>
  );
}

export function ContactCell({ branch }) {
  return (
    <div className="cell-stack">
      <span className="cell-title">{branch.contactPersonName}</span>
      <span className="cell-sub">{branch.contactPersonEmail}</span>
      <span className="cell-sub">{branch.contactPersonPhone}</span>
    </div>
  );
}

export function LocationCell({ branch }) {
  return (
    <StackCell
      title={branch.city}
      subtitle={[branch.state, branch.country].filter(Boolean).join(", ")}
    />
  );
}

export function OutletPriceCell({ price }) {
  return price !== null && price !== undefined ? (
    <span className="price-override">{formatMoney(price)}</span>
  ) : (
    <span className="price-inherit">Default</span>
  );
}
