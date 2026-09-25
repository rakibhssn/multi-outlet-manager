import React, { useState } from "react";
import { useFormik } from "formik";
import { useSetAtom } from "jotai";
import { format } from "date-fns";
import {
  CustomDatepicker,
  CustomDialog,
  CustomSelectField,
  CustomSwitch,
  InputField,
} from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import {
  DESIGNATION_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  SALARY_TYPE_OPTIONS,
} from "@/lib/Constant";
import { StaffValues } from "@/lib/Schema/FormValues";
import {
  StaffUpdateValidation,
  StaffValidation,
} from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

const ACCOUNT_FIELDS = ["userEmail", "userPassword", "userConfirmPassword"];

const toDay = (value) => (value ? String(value).slice(0, 10) : "");

function toFormValues(staff, branchId) {
  if (!staff) return { ...StaffValues, branchId: branchId ?? "" };
  const values = Object.keys(StaffValues).reduce(
    (result, key) => ({ ...result, [key]: staff[key] ?? StaffValues[key] }),
    {},
  );
  return {
    ...values,
    hireDate: toDay(staff.hireDate),
    exitDate: toDay(staff.exitDate),
    userEmail: staff.users?.[0]?.email ?? "",
    userPassword: "",
    userConfirmPassword: "",
  };
}

function toPayload(values) {
  const staff = Object.fromEntries(
    Object.entries(values).filter(([key]) => !ACCOUNT_FIELDS.includes(key)),
  );
  return {
    ...staff,
    user: {
      email: values.userEmail,
      ...(values.userPassword ? { password: values.userPassword } : {}),
    },
  };
}

export default function StaffEntry({
  open,
  staff,
  branchId,
  outletOptions = [],
  lockOutlet = false,
  onClose,
  onSaved,
}) {
  const setNotification = useSetAtom(notificationModal);
  const [loading, setLoading] = useState(false);
  const isEdit = !!staff?.id;
  const hasAccount = !!staff?.users?.[0];

  function handleSubmit(values) {
    setLoading(true);

    const payload = toPayload(values);

    (isEdit
      ? ApiService.put(API_LINK.StaffDetails(staff.id), payload)
      : ApiService.post(API_LINK.Staff, payload)
    )
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          onSaved?.(res?.data);
          formik.resetForm();
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to save staff",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const formik = useFormik({
    initialValues: toFormValues(staff, branchId),
    validationSchema: hasAccount ? StaffUpdateValidation : StaffValidation,
    enableReinitialize: true,
    onSubmit: handleSubmit,
  });

  const handleClose = () => {
    formik.resetForm();
    onClose?.();
  };

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && handleClose()}
      title={isEdit ? "Edit Staff" : "Add Staff"}
      description="Staff job details, personal information and login account."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <p className="form-section">Assignment</p>
        <CustomSelectField
          label="Outlet"
          placeholder="Select outlet"
          options={outletOptions}
          required
          className="form-span-2"
          disabled={lockOutlet}
          value={formik.values.branchId}
          onValueChange={formik.handleChange("branchId")}
          onBlur={formik.handleBlur("branchId")}
          showError={!!(formik.touched.branchId && formik.errors.branchId)}
          error={formik.errors.branchId}
        />

        <p className="form-section">Job</p>
        <InputField
          label="Badge Number"
          placeholder="EMP-001"
          required
          value={formik.values.badgeNumber}
          onChange={formik.handleChange("badgeNumber")}
          onBlur={formik.handleBlur("badgeNumber")}
          showError={!!(formik.touched.badgeNumber && formik.errors.badgeNumber)}
          error={formik.errors.badgeNumber}
        />
        <InputField
          label="Job Title"
          placeholder="Front cashier"
          required
          value={formik.values.jobTitle}
          onChange={formik.handleChange("jobTitle")}
          onBlur={formik.handleBlur("jobTitle")}
          showError={!!(formik.touched.jobTitle && formik.errors.jobTitle)}
          error={formik.errors.jobTitle}
        />
        <CustomSelectField
          label="Designation"
          placeholder="Select designation"
          options={DESIGNATION_OPTIONS}
          required
          value={formik.values.designation}
          onValueChange={formik.handleChange("designation")}
          onBlur={formik.handleBlur("designation")}
          showError={!!(formik.touched.designation && formik.errors.designation)}
          error={formik.errors.designation}
        />
        <CustomSelectField
          label="Employment Type"
          placeholder="Select type"
          options={EMPLOYMENT_TYPE_OPTIONS}
          required
          value={formik.values.employmentType}
          onValueChange={formik.handleChange("employmentType")}
          onBlur={formik.handleBlur("employmentType")}
          showError={!!(formik.touched.employmentType && formik.errors.employmentType)}
          error={formik.errors.employmentType}
        />
        <CustomSelectField
          label="Salary Type"
          placeholder="Select salary type"
          options={SALARY_TYPE_OPTIONS}
          required
          value={formik.values.salaryType}
          onValueChange={formik.handleChange("salaryType")}
          onBlur={formik.handleBlur("salaryType")}
          showError={!!(formik.touched.salaryType && formik.errors.salaryType)}
          error={formik.errors.salaryType}
        />
        <CustomDatepicker
          label="Hire Date"
          placeholder="Pick a date"
          required
          value={formik.values.hireDate}
          onChange={(date) => formik.handleChange("hireDate")(date ? format(date, "yyyy-MM-dd") : "")}
          onBlur={formik.handleBlur("hireDate")}
          showError={!!(formik.touched.hireDate && formik.errors.hireDate)}
          error={formik.errors.hireDate}
        />
        <CustomDatepicker
          label="Exit Date"
          placeholder="Pick a date"
          hint="Leave empty while employed"
          value={formik.values.exitDate}
          onChange={(date) => formik.handleChange("exitDate")(date ? format(date, "yyyy-MM-dd") : "")}
          onBlur={formik.handleBlur("exitDate")}
          showError={!!(formik.touched.exitDate && formik.errors.exitDate)}
          error={formik.errors.exitDate}
        />

        <p className="form-section">Personal</p>
        <InputField
          label="First Name"
          placeholder="First Name"
          required
          value={formik.values.firstName}
          onChange={formik.handleChange("firstName")}
          onBlur={formik.handleBlur("firstName")}
          showError={!!(formik.touched.firstName && formik.errors.firstName)}
          error={formik.errors.firstName}
        />
        <InputField
          label="Last Name"
          placeholder="Last Name"
          required
          value={formik.values.lastName}
          onChange={formik.handleChange("lastName")}
          onBlur={formik.handleBlur("lastName")}
          showError={!!(formik.touched.lastName && formik.errors.lastName)}
          error={formik.errors.lastName}
        />
        <CustomSelectField
          label="Gender"
          placeholder="Select gender"
          options={GENDER_OPTIONS}
          required
          value={formik.values.gender}
          onValueChange={formik.handleChange("gender")}
          onBlur={formik.handleBlur("gender")}
          showError={!!(formik.touched.gender && formik.errors.gender)}
          error={formik.errors.gender}
        />
        <CustomDatepicker
          label="Date of Birth"
          placeholder="Pick a date"
          required
          maxDate={new Date()}
          value={formik.values.dob}
          onChange={(date) => formik.handleChange("dob")(date ? format(date, "yyyy-MM-dd") : "")}
          onBlur={formik.handleBlur("dob")}
          showError={!!(formik.touched.dob && formik.errors.dob)}
          error={formik.errors.dob}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="staff@outlet.com"
          value={formik.values.email}
          onChange={formik.handleChange("email")}
          onBlur={formik.handleBlur("email")}
          showError={!!(formik.touched.email && formik.errors.email)}
          error={formik.errors.email}
        />
        <InputField
          label="Phone"
          type="tel"
          placeholder="+8801XXXXXXXXX"
          required
          value={formik.values.phone}
          onChange={formik.handleChange("phone")}
          onBlur={formik.handleBlur("phone")}
          showError={!!(formik.touched.phone && formik.errors.phone)}
          error={formik.errors.phone}
        />

        <p className="form-section">Address</p>
        <InputField
          label="Address Line 1"
          placeholder="House, road, area"
          required
          className="form-span-2"
          value={formik.values.address1}
          onChange={formik.handleChange("address1")}
          onBlur={formik.handleBlur("address1")}
          showError={!!(formik.touched.address1 && formik.errors.address1)}
          error={formik.errors.address1}
        />
        <InputField
          label="Address Line 2"
          placeholder="Apartment, floor (optional)"
          className="form-span-2"
          value={formik.values.address2}
          onChange={formik.handleChange("address2")}
          onBlur={formik.handleBlur("address2")}
          showError={!!(formik.touched.address2 && formik.errors.address2)}
          error={formik.errors.address2}
        />
        <InputField
          label="City"
          placeholder="City"
          required
          value={formik.values.city}
          onChange={formik.handleChange("city")}
          onBlur={formik.handleBlur("city")}
          showError={!!(formik.touched.city && formik.errors.city)}
          error={formik.errors.city}
        />
        <InputField
          label="State"
          placeholder="State"
          required
          value={formik.values.state}
          onChange={formik.handleChange("state")}
          onBlur={formik.handleBlur("state")}
          showError={!!(formik.touched.state && formik.errors.state)}
          error={formik.errors.state}
        />
        <InputField
          label="Country"
          placeholder="Country"
          required
          value={formik.values.country}
          onChange={formik.handleChange("country")}
          onBlur={formik.handleBlur("country")}
          showError={!!(formik.touched.country && formik.errors.country)}
          error={formik.errors.country}
        />

        <p className="form-section">Login Account</p>
        <InputField
          label="Login Email"
          type="email"
          placeholder="staff.login@outlet.com"
          required
          className="form-span-2"
          autoComplete="off"
          hint="This account is created as the outlet's Staff user"
          value={formik.values.userEmail}
          onChange={formik.handleChange("userEmail")}
          onBlur={formik.handleBlur("userEmail")}
          showError={!!(formik.touched.userEmail && formik.errors.userEmail)}
          error={formik.errors.userEmail}
        />
        <InputField
          label={hasAccount ? "New Password" : "Password"}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          hint={hasAccount ? "Leave blank to keep the current password" : undefined}
          value={formik.values.userPassword}
          onChange={formik.handleChange("userPassword")}
          onBlur={formik.handleBlur("userPassword")}
          showError={!!(formik.touched.userPassword && formik.errors.userPassword)}
          error={formik.errors.userPassword}
        />
        <InputField
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          value={formik.values.userConfirmPassword}
          onChange={formik.handleChange("userConfirmPassword")}
          onBlur={formik.handleBlur("userConfirmPassword")}
          showError={!!(formik.touched.userConfirmPassword && formik.errors.userConfirmPassword)}
          error={formik.errors.userConfirmPassword}
        />
        <CustomSwitch
          name="status"
          label="Status"
          onLabel="Active"
          offLabel="Inactive"
          checked={formik.values.status === "ACTIVE"}
          onChange={(isActive) =>
            formik.setFieldValue("status", isActive ? "ACTIVE" : "INACTIVE")
          }
        />
      </form>
    </CustomDialog>
  );
}
