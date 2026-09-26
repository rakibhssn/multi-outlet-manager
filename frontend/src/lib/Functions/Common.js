export const formatMoney = (value) =>
  value === null || value === undefined || value === ""
    ? "—"
    : Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toPriceInput = (value) =>
  value === null || value === undefined ? "" : String(Number(value));
