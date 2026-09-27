import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import {
  AutoCompleteField,
  CustomDatepicker,
  CustomDialog,
  CustomSelectField,
  CustomSwitch,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { outletOption } from "@/lib/Functions/Common";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useRoleOptions from "@/hooks/useRoleOptions";
import useScope from "@/hooks/useScope";
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
import { dateProps, inputProps, selectProps } from "@/lib/Functions/FormField";

const ACCOUNT_FIELDS = [
  "userEmail",
  "userRoleId",
  "userPassword",
  "userConfirmPassword",
];

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
    userRoleId: staff.users?.[0]?.role?.id ?? "",
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
      roleId: values.userRoleId,
      ...(values.userPassword ? { password: values.userPassword } : {}),
    },
  };
}

export default function StaffEntry({
  open,
  staff,
  branchId,
  lockedOutlet,
  lockOutlet = false,
  onClose,
  onSaved,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const isEdit = !!staff?.id;
  const hasAccount = !!staff?.users?.[0];
  const scope = useScope();
  const selectedOutlet = useMemo(
    () => (isEdit ? outletOption(staff?.outlet) : (lockedOutlet ?? null)),
    [isEdit, staff?.outlet, lockedOutlet],
  );
  const outlets = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    selected: selectedOutlet,
    enabled: open && !lockOutlet && !isEdit,
    errorText: "Failed to load outlets",
  });

  function handleSubmit(values) {
    setLoading(true);
    const payload = toPayload(values);
    const request = isEdit
      ? ApiService.put(API_LINK.StaffDetails(staff.id), payload)
      : ApiService.post(API_LINK.Staff, payload);

    notify
      .submit(request, {
        errorText: "Failed to save staff",
        onSuccess: (res) => {
          onSaved?.(res?.data);
          formik.resetForm();
        },
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: toFormValues(staff, branchId),
    validationSchema: hasAccount ? StaffUpdateValidation : StaffValidation,
    enableReinitialize: true,
    onSubmit: handleSubmit,
  });

  const roles = useRoleOptions({
    accountType: "OUTLET_STAFF",
    companyId: scope.companyId || staff?.outlet?.parent?.id,
    account: staff?.users?.[0],
    formik,
    enabled: open,
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
        <AutoCompleteField
          label="Outlet"
          placeholder="Search outlet"
          options={outlets.options}
          onSearch={outlets.onSearch}
          loading={outlets.loading}
          filterLocally={false}
          required
          className="form-span-2"
          disabled={lockOutlet || isEdit}
          hint={
            isEdit && !lockOutlet
              ? "Use Transfer from the staff list to move to another outlet"
              : undefined
          }
          {...selectProps(formik, "branchId")}
        />

        <p className="form-section">Job</p>
        <InputField
          label="Badge Number"
          placeholder="EMP-001"
          required
          {...inputProps(formik, "badgeNumber")}
        />
        <InputField
          label="Job Title"
          placeholder="Front cashier"
          required
          {...inputProps(formik, "jobTitle")}
        />
        <CustomSelectField
          label="Designation"
          placeholder="Select designation"
          options={DESIGNATION_OPTIONS}
          required
          {...selectProps(formik, "designation")}
        />
        <CustomSelectField
          label="Employment Type"
          placeholder="Select type"
          options={EMPLOYMENT_TYPE_OPTIONS}
          required
          {...selectProps(formik, "employmentType")}
        />
        <CustomSelectField
          label="Salary Type"
          placeholder="Select salary type"
          options={SALARY_TYPE_OPTIONS}
          required
          {...selectProps(formik, "salaryType")}
        />
        <CustomDatepicker
          label="Hire Date"
          placeholder="Pick a date"
          required
          {...dateProps(formik, "hireDate")}
        />
        <CustomDatepicker
          label="Exit Date"
          placeholder="Pick a date"
          hint="Leave empty while employed"
          {...dateProps(formik, "exitDate")}
        />

        <p className="form-section">Personal</p>
        <InputField
          label="First Name"
          placeholder="First Name"
          required
          {...inputProps(formik, "firstName")}
        />
        <InputField
          label="Last Name"
          placeholder="Last Name"
          required
          {...inputProps(formik, "lastName")}
        />
        <CustomSelectField
          label="Gender"
          placeholder="Select gender"
          options={GENDER_OPTIONS}
          required
          {...selectProps(formik, "gender")}
        />
        <CustomDatepicker
          label="Date of Birth"
          placeholder="Pick a date"
          required
          maxDate={new Date()}
          {...dateProps(formik, "dob")}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="staff@outlet.com"
          {...inputProps(formik, "email")}
        />
        <InputField
          label="Phone"
          type="tel"
          placeholder="+8801XXXXXXXXX"
          required
          {...inputProps(formik, "phone")}
        />

        <p className="form-section">Address</p>
        <InputField
          label="Address Line 1"
          placeholder="House, road, area"
          required
          className="form-span-2"
          {...inputProps(formik, "address1")}
        />
        <InputField
          label="Address Line 2"
          placeholder="Apartment, floor (optional)"
          className="form-span-2"
          {...inputProps(formik, "address2")}
        />
        <InputField
          label="City"
          placeholder="City"
          required
          {...inputProps(formik, "city")}
        />
        <InputField
          label="State"
          placeholder="State"
          required
          {...inputProps(formik, "state")}
        />
        <InputField
          label="Country"
          placeholder="Country"
          required
          {...inputProps(formik, "country")}
        />

        <p className="form-section">Login Account</p>
        <InputField
          label="Login Email"
          type="email"
          placeholder="staff.login@outlet.com"
          required
          autoComplete="off"
          hint="This account is created as the outlet's Staff user"
          {...inputProps(formik, "userEmail")}
        />
        <CustomSelectField
          label="Login Role"
          placeholder="Select role"
          options={roles.options}
          disabled={roles.loading}
          required
          hint="Decides what this staff member can see and do"
          {...selectProps(formik, "userRoleId")}
        />
        <InputField
          label={hasAccount ? "New Password" : "Password"}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          hint={
            hasAccount ? "Leave blank to keep the current password" : undefined
          }
          {...inputProps(formik, "userPassword")}
        />
        <InputField
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          {...inputProps(formik, "userConfirmPassword")}
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
