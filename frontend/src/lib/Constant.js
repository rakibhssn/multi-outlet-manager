import { humanize } from "./Functions/Common";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3050/api/v1/";

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const toOptions = (values) =>
  values.map((value) => ({ value, label: humanize(value) }));

const DESIGNATION_OPTIONS = toOptions([
  "GENERAL_MANAGER",
  "ASSISTANT_MANAGER",
  "SHIFT_MANAGER",
  "CASHIER",
  "SERVER",
  "HOST",
  "COOK",
  "CHEF",
  "KITCHEN_STAFF",
  "BARISTA",
  "DELIVERY_DRIVER",
  "CLEANER",
]);

const EMPLOYMENT_TYPE_OPTIONS = toOptions([
  "FULL_TIME",
  "PART_TIME",
  "TEMPORARY",
  "SEASONAL",
  "CONTRACTOR",
]);

const SALARY_TYPE_OPTIONS = toOptions(["HOURLY", "SALARY"]);

const GENDER_OPTIONS = toOptions(["MALE", "FEMALE", "OTHER"]);

const ITEM_STATUS_OPTIONS = toOptions([
  "AVAILABLE",
  "UNAVAILABLE",
  "SOLD_OUT",
  "DISCONTINUED",
]);

const ORDER_TYPE_OPTIONS = toOptions(["DINE_IN", "TAKEAWAY", "DELIVERY"]);

const SHIFT_STATUS_OPTIONS = toOptions(["ON_SHIFT", "COMPLETED"]);

const ORDER_STATUS_OPTIONS = toOptions(["CONFIRMED", "COMPLETED", "CANCELLED"]);

export {
  API_URL,
  STATUS_OPTIONS,
  DESIGNATION_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  ITEM_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  ORDER_STATUS_OPTIONS,
  SHIFT_STATUS_OPTIONS,
};
