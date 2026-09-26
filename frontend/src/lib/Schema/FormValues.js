export const LoginValues = {
  email: "",
  password: "",
};

export const CompanyValues = {
  name: "",
  contactPersonName: "",
  contactPersonEmail: "",
  contactPersonPhone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  status: "ACTIVE",
  userEmail: "",
  userPassword: "",
  userConfirmPassword: "",
};

export const OutletValues = {
  ...CompanyValues,
  companyId: "",
};

export const StaffValues = {
  branchId: "",
  badgeNumber: "",
  designation: "",
  employmentType: "",
  jobTitle: "",
  salaryType: "SALARY",
  hireDate: "",
  exitDate: "",
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  country: "",
  status: "ACTIVE",
  userEmail: "",
  userPassword: "",
  userConfirmPassword: "",
};

export const StaffTransferValues = {
  branchId: "",
  transferDate: "",
  note: "",
};

export const MenuValues = {
  name: "",
  description: "",
  menuImage: "",
  status: "ACTIVE",
};

export const MenuItemValues = {
  menuId: "",
  name: "",
  description: "",
  menuItemImage: "",
  basePrice: "",
  price: "",
  status: "AVAILABLE",
};

export const OutletPriceValues = {
  price: "",
  stock: "0",
};
