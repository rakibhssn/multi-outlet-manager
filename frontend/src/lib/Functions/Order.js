import { ORDER_TYPE_OPTIONS } from "../Constant";
import { labelOf } from "./Common";

export const orderTypeText = (orderType, tableNumber) =>
  `${labelOf(ORDER_TYPE_OPTIONS, orderType)}${tableNumber ? ` · Table ${tableNumber}` : ""}`;
