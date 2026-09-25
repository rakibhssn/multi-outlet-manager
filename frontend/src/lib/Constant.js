const API_URL = "http://localhost:3050/api/v1/";
const AUTH_SECRET = "273b7b68-1241-4122-a02e-5e2f0be59861";

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

const toOptions = (values) =>
  values.map((value) => ({
    value,
    label: value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

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

export {
  API_URL,
  AUTH_SECRET,
  STATUS_OPTIONS,
  DESIGNATION_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SALARY_TYPE_OPTIONS,
  GENDER_OPTIONS,
  ITEM_STATUS_OPTIONS,
};
