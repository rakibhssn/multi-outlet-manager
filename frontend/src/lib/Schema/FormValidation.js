import * as yup from "yup";

export const LoginValidation = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

const companyFields = {
  name: yup.string().trim().required("Company name is required"),
  contactPersonName: yup.string().trim().required("Contact person is required"),
  contactPersonEmail: yup
    .string()
    .trim()
    .email("Invalid email")
    .required("Contact email is required"),
  contactPersonPhone: yup
    .string()
    .trim()
    .matches(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number")
    .required("Contact phone is required"),
  address: yup.string().trim().required("Address is required"),
  city: yup.string().trim().required("City is required"),
  state: yup.string().trim().required("State is required"),
  zipCode: yup.string().trim().required("Zip code is required"),
  country: yup.string().trim().required("Country is required"),
  status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).required(),
  userEmail: yup
    .string()
    .trim()
    .email("Invalid email")
    .required("Login email is required"),
};

const confirmPassword = yup
  .string()
  .oneOf([yup.ref("userPassword")], "Passwords do not match");

export const CompanyValidation = yup.object({
  ...companyFields,
  userPassword: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  userConfirmPassword: confirmPassword.required("Confirm the password"),
});

export const CompanyUpdateValidation = yup.object({
  ...companyFields,
  userPassword: yup.string().min(6, "Password must be at least 6 characters"),
  userConfirmPassword: confirmPassword.when("userPassword", {
    is: (value) => !!value,
    then: (schema) => schema.required("Confirm the password"),
  }),
});

const outletFields = {
  companyId: yup.string().required("Company is required"),
  name: yup.string().trim().required("Outlet name is required"),
};

export const OutletValidation = CompanyValidation.shape(outletFields);

export const OutletUpdateValidation = CompanyUpdateValidation.shape(outletFields);

const staffFields = {
  branchId: yup.string().required("Outlet is required"),
  badgeNumber: yup.string().trim().required("Badge number is required"),
  designation: yup.string().required("Designation is required"),
  employmentType: yup.string().required("Employment type is required"),
  jobTitle: yup.string().trim().required("Job title is required"),
  salaryType: yup.string().required("Salary type is required"),
  hireDate: yup.string().required("Hire date is required"),
  exitDate: yup.string(),
  firstName: yup.string().trim().required("First name is required"),
  lastName: yup.string().trim().required("Last name is required"),
  gender: yup.string().required("Gender is required"),
  dob: yup.string().required("Date of birth is required"),
  email: yup.string().trim().email("Invalid email"),
  phone: yup
    .string()
    .trim()
    .matches(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number")
    .required("Phone is required"),
  address1: yup.string().trim().required("Address is required"),
  address2: yup.string().trim(),
  city: yup.string().trim().required("City is required"),
  state: yup.string().trim().required("State is required"),
  country: yup.string().trim().required("Country is required"),
  status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).required(),
  userEmail: yup
    .string()
    .trim()
    .email("Invalid email")
    .required("Login email is required"),
};

export const StaffValidation = yup.object({
  ...staffFields,
  userPassword: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  userConfirmPassword: confirmPassword.required("Confirm the password"),
});

export const StaffUpdateValidation = yup.object({
  ...staffFields,
  userPassword: yup.string().min(6, "Password must be at least 6 characters"),
  userConfirmPassword: confirmPassword.when("userPassword", {
    is: (value) => !!value,
    then: (schema) => schema.required("Confirm the password"),
  }),
});

export const MenuValidation = yup.object({
  name: yup.string().trim().required("Menu name is required"),
  description: yup.string().trim(),
  menuImage: yup.string().trim().url("Enter a valid image URL"),
  status: yup.string().oneOf(["ACTIVE", "INACTIVE"]).required(),
});

export const MenuItemValidation = yup.object({
  menuId: yup.string().required("Menu is required"),
  name: yup.string().trim().required("Item name is required"),
  description: yup.string().trim(),
  menuItemImage: yup.string().trim().url("Enter a valid image URL"),
  basePrice: yup
    .number()
    .typeError("Base price must be a number")
    .min(0, "Base price cannot be negative")
    .required("Base price is required"),
  price: yup
    .number()
    .transform((value, original) => (original === "" ? undefined : value))
    .typeError("Price must be a number")
    .min(0, "Price cannot be negative"),
  status: yup
    .string()
    .oneOf(["AVAILABLE", "UNAVAILABLE", "SOLD_OUT", "DISCONTINUED"])
    .required("Status is required"),
});
